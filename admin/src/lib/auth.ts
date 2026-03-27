import { cookies } from 'next/headers';

const COOKIE_NAME = 'admin_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function verifyAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(COOKIE_NAME);
}

export function setAuthCookie(response: Response): Response {
  response.headers.append('Set-Cookie', `${COOKIE_NAME}=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`);
  return response;
}

export function clearAuthCookie(response: Response): Response {
  response.headers.append('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return response;
}
