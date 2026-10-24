import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function claims(data) {
  const found = [];
  const nodes = data["@graph"] ?? [data];
  for (const node of nodes) {
    if (node["@type"] === "FAQPage") {
      for (const question of node.mainEntity ?? []) {
        const text = question.acceptedAnswer?.text;
        if (text) found.push(text);
      }
    }
    if (node["@type"] === "ItemList") {
      for (const item of node.itemListElement ?? []) {
        if (item.name) found.push(item.name);
      }
    }
    if (node["@type"] === "Article" && node.headline) found.push(node.headline);
  }
  return found;
}

async function htmlFiles(dir) {
  const files = [];
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith(".html") && !entry.name.startsWith("_")) files.push(full);
  }
  return files;
}

export function missingClaims(html) {
  const visible = visibleText(html);
  const missing = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const json = match[1].replace(/\\u003c/g, "<");
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      missing.push("unreadable structured data");
      continue;
    }
    for (const claim of claims(data)) {
      if (!visible.includes(claim.replace(/\s+/g, " ").trim())) missing.push(claim);
    }
  }
  return missing;
}

async function checkFiles() {
  const root = path.join(process.cwd(), ".next", "server", "app");
  const files = await htmlFiles(root);
  const problems = [];
  for (const file of files) {
    const html = await readFile(file, "utf8");
    for (const claim of missingClaims(html)) {
      problems.push(`${path.relative(root, file)}: ${claim}`);
    }
  }
  return { files: files.length, problems };
}

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

function selfCheck() {
  const html = `<html><body><p>Alpha leads.</p><script type="application/ld+json">{"@type":"FAQPage","mainEntity":[{"acceptedAnswer":{"text":"Alpha leads."}}]}</script><script type="application/ld+json">{"@type":"FAQPage","mainEntity":[{"acceptedAnswer":{"text":"Not on the page."}}]}</script></body></html>`;
  const missing = missingClaims(html);
  assert(missing.length === 1 && missing[0] === "Not on the page.", "a schema claim missing from the page should fail");
  assert(missingClaims(`<p>Alpha</p><script type="application/ld+json">{"@type":"ItemList","itemListElement":[{"name":"Alpha"}]}</script>`).length === 0, "a visible name should pass");
  console.log("schema self-check ok");
}

if (process.argv.includes("--self-check")) {
  selfCheck();
  process.exit(0);
}

const result = await checkFiles();
if (!result.files) {
  console.warn("schema check: no prerendered HTML found, skipping");
  process.exit(0);
}
if (result.problems.length) {
  for (const problem of result.problems) console.error(problem);
  process.exit(1);
}
console.log(`schema check ok (${result.files} pages)`);
