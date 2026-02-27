const decodeBase64Url = (value: string): string | null => {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return atob(padded);
  } catch {
    return null;
  }
};

export const getJwtExpirationMs = (token: string | null): number | null => {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length < 2 || !parts[1]) {
    return null;
  }

  const decodedPayload = decodeBase64Url(parts[1]);
  if (!decodedPayload) {
    return null;
  }

  try {
    const payload = JSON.parse(decodedPayload) as { exp?: unknown };
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
      return null;
    }

    return payload.exp * 1000;
  } catch {
    return null;
  }
};

export const isJwtExpired = (token: string | null): boolean => {
  const expiration = getJwtExpirationMs(token);
  if (!expiration) {
    return false;
  }

  return Date.now() >= expiration;
};
