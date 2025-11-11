export function getOrSetSessionId(request: Request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/sessionId=([^;]+)/);

  if (match) {
    return { sessionId: match[1], setCookie: null };
  }

  const sessionId = crypto.randomUUID();
  const setCookie = `sessionId=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  return { sessionId, setCookie };
}
