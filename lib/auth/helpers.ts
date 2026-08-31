import { createServerClientInstance } from '@/lib/supabase/server';
import type { User, Professional } from '@/types/db';

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerClientInstance();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  return data;
}

export async function getCurrentProfessional(): Promise<Professional | null> {
  const supabase = await createServerClientInstance();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data } = await supabase
    .from('professionals')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  return data;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }
  return user;
}

export async function requireProfessional(): Promise<Professional> {
  const professional = await getCurrentProfessional();
  if (!professional) {
    throw new Error('Unauthorized: Professional not authenticated');
  }
  if (!professional.verified) {
    throw new Error('Forbidden: Professional not verified');
  }
  return professional;
}

export async function getUserRole(): Promise<'user' | 'professional' | null> {
  const [user, professional] = await Promise.all([
    getCurrentUser(),
    getCurrentProfessional(),
  ]);
  
  if (user) return 'user';
  if (professional) return 'professional';
  return null;
}