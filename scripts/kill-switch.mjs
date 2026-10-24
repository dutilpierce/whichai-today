import { appendFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

const site = JSON.parse(await readFile(new URL("../lib/site.json", import.meta.url), "utf8"));
const publish = site.auto_publish ? "true" : "false";
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `publish=${publish}\n`);
}
console.log(publish === "true" ? "Publishing is on." : "Publishing is paused.");
