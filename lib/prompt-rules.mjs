function strip(text, value) {
  if (!value) return text;
  return text.replace(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "");
}

/** Reject a generated prompt that states facts, names the wrong model, or stops being instructions. */
export function checkPrompt(text, options = {}) {
  const errors = [];
  const query = options.query ?? "";
  const target = options.target ?? "";
  const targetProvider = (options.targetProvider ?? "").toLowerCase();

  if (typeof text !== "string" || text.trim().length < 20) {
    return ["prompt is empty"];
  }
  if (!/^Role:/m.test(text) || !/^Task:/m.test(text) || !/^Constraints:/m.test(text)) {
    errors.push("prompt is not instructions");
  }
  if (text.length > 2500) errors.push("prompt is too long");
  if (/\$\s?\d|\bper month\b|\bper million\b|\bdollars?\b/i.test(text)) errors.push("prompt names a price");
  if (/%/.test(text)) errors.push("prompt has a percentage");
  if (/jailbreak|ignore (?:all |previous |the )?(?:instructions|rules)|bypass(?: the)? safety|\bDAN\b/i.test(text)) {
    errors.push("prompt tries to bypass safety");
  }

  const lower = text.toLowerCase();
  const targetLower = target.toLowerCase();
  for (const name of options.names ?? []) {
    const value = String(name).trim().toLowerCase();
    if (value.length < 3 || value === targetLower) continue;
    if (lower.includes(value)) errors.push(`prompt names ${name}`);
  }
  for (const provider of options.providers ?? []) {
    const value = String(provider).trim().toLowerCase();
    if (value.length < 3 || value === targetProvider) continue;
    if (lower.includes(value)) errors.push(`prompt names ${provider}`);
  }
  for (const board of options.boards ?? []) {
    const value = String(board).trim().toLowerCase();
    if (value.length < 4) continue;
    if (lower.includes(value)) errors.push(`prompt cites ${board}`);
  }

  const scanned = strip(strip(text, target), options.targetProvider ?? "");
  const allowed = new Set(query.match(/\d+(?:\.\d+)?/g) ?? []);
  for (const match of scanned.matchAll(/\d+(?:\.\d+)?/g)) {
    const value = match[0];
    if (allowed.has(value)) continue;
    const before = match.index === 0 ? "\n" : scanned[match.index - 1];
    const after = scanned[match.index + value.length] ?? "";
    const marker = (before === "\n" || before === " ") && (after === "." || after === ")");
    const whole = Number(value);
    if (marker && Number.isInteger(whole) && whole >= 1 && whole <= 20 && !value.includes(".")) continue;
    errors.push(`prompt cites ${value}, which is not in the request`);
  }

  return errors;
}
