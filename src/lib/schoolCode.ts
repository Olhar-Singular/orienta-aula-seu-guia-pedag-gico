/**
 * Generate a random 6-character alphanumeric school code (uppercase).
 */
export function generateSchoolCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function isValidSchoolCode(code: string): boolean {
  // Only uppercase letters (excluding ambiguous O, I) and digits 2-9
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{6}$/.test(code);
}
