// Simple in-memory token store for password reset
// In production, this should be stored in a database with proper expiry handling
export interface ResetToken {
  email: string;
  expiresAt: number;
}

const resetTokens = new Map<string, ResetToken>();

export function storeResetToken(token: string, email: string, expiryMs: number = 60 * 60 * 1000): void {
  resetTokens.set(token, {
    email: email.toLowerCase(),
    expiresAt: Date.now() + expiryMs,
  });
}

export function getResetToken(token: string): ResetToken | null {
  const tokenData = resetTokens.get(token);

  if (!tokenData) {
    return null;
  }

  // Check if token is expired
  if (tokenData.expiresAt < Date.now()) {
    resetTokens.delete(token);
    return null;
  }

  return tokenData;
}

export function deleteResetToken(token: string): void {
  resetTokens.delete(token);
}

export function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [token, data] of resetTokens.entries()) {
    if (data.expiresAt < now) {
      resetTokens.delete(token);
    }
  }
}
