'use server';
import { redirect } from 'next/navigation';
import { setAuthCookie } from '@/lib/auth';

export async function login(_prevState: string | null, formData: FormData): Promise<string | null> {
  const password = formData.get('password') as string;
  if (!password || password !== process.env.ADMIN_PASSWORD) return 'Invalid password';
  await setAuthCookie();
  redirect('/');
}
