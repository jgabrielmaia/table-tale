const b64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Unsigned JWT-shaped token. supabase-js only decodes it; the fake backend never verifies signatures. */
export function fakeJwt(claims: Record<string, unknown>): string {
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(claims)}.e2e-signature`;
}

export function subjectOf(authorization: string | undefined): string | null {
  const token = authorization?.replace(/^Bearer\s+/i, '');
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string };
    return claims.sub ?? null;
  } catch {
    return null;
  }
}
