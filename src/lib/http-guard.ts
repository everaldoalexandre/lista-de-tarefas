export function isCrossSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host');
  if (!host) return false;

  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export function crossSiteResponse(): Response {
  return Response.json({ error: 'Cross-origin request blocked' }, { status: 403 });
}
