export function sanitizeText(input: string): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeStringArray(values: string[]): string[] {
  return values
    .map((value) => sanitizeText(value))
    .filter((value) => value.length > 0);
}
