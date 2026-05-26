import { supabase } from './supabase';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

export interface Profile {
  id: string;
  name: string;
  email: string;
  fuel_type: string;
  plan: string;
  created_at: string;
}

/**
 * Înregistrare utilizator nou + metadata pentru trigger-ul de profil
 */
export async function signUp(email: string, password: string, name: string, captchaToken?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      captchaToken,
    },
  });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Autentificare cu email + parolă
 */
export async function signIn(email: string, password: string, captchaToken?: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Deconectare
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/**
 * Returnează sesiunea curentă sau null
 */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

/**
 * Preia profilul utilizatorului autentificat din tabelul `profiles`
 */
export async function getProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw new Error(error.message);
  return data as Profile;
}

/**
 * Sincronizează planul din app în Supabase profiles (best-effort, silent fail)
 */
export async function syncPlanToSupabase(plan: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ plan }).eq('id', user.id);
  } catch {}
}

export async function signInWithGoogle() {
  const redirectTo = makeRedirectUri({ scheme: 'drumiq', path: 'auth-callback' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw new Error(error.message);
  if (!data.url) throw new Error('Nu s-a putut genera link-ul de autentificare Google.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'success' && result.url) {
    const url = new URL(result.url);
    const params = new URLSearchParams(url.hash.substring(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (access_token && refresh_token) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (sessionError) throw new Error(sessionError.message);
      return;
    }

    const code = url.searchParams.get('code');
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw new Error(exchangeError.message);
      return;
    }
  }

  throw new Error('Autentificarea Google a fost anulată.');
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  return supabase.auth.onAuthStateChange(callback);
}
