export type SensitiveKind = "" | "money" | "legal" | "medical" | "mental" | "crisis";

const CHECKS: { kind: SensitiveKind; pattern: RegExp }[] = [
  { kind: "crisis", pattern: /\b(suicide|suicidal|kill myself|want to die|self-harm|self harm)\b/i },
  { kind: "mental", pattern: /\b(therapy|therapist|depression|anxiety|mental health)\b/i },
  { kind: "medical", pattern: /\b(diagnosis|symptom|medication|cancer|prescription)\b/i },
  { kind: "money", pattern: /\b(invest|investment|stocks?|taxes|mortgage|crypto|loan|retirement)\b/i },
  { kind: "legal", pattern: /\b(contract|lawsuit|lease|attorney|lawyer|legal)\b/i },
];

export function sensitiveKind(query: string, categoryKey = ""): SensitiveKind {
  for (const check of CHECKS) {
    if (check.pattern.test(query)) return check.kind;
  }
  if (categoryKey === "legal_analysis") return "legal";
  return "";
}

export function sensitiveLine(kind: SensitiveKind) {
  if (kind === "crisis") {
    return "If you might act on this, call or text 988 in the US, or your local emergency number. This site does not pick an AI for a crisis.";
  }
  if (kind === "legal") {
    return "General information only, not legal advice. Don't paste confidential documents into a chat that trains on chats by default.";
  }
  if (kind === "medical") {
    return "General information only, not medical advice. Don't paste confidential documents into a chat that trains on chats by default.";
  }
  if (kind === "money") {
    return "General information only, not financial advice. Don't paste confidential documents into a chat that trains on chats by default.";
  }
  if (kind === "mental") {
    return "General information only, not a substitute for professional care. Don't paste private notes into a chat that trains on chats by default.";
  }
  return "";
}
