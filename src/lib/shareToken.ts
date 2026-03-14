/**
 * Generates a URL-safe unique token for shared adaptations.
 */
export function generateShareToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function isValidShareToken(token: string): boolean {
  return /^[A-Za-z2-9]{24}$/.test(token);
}
