/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_CUSTOM_URL = 'dukaanflow_custom_supabase_url';
const STORAGE_KEY_CUSTOM_ANON = 'dukaanflow_custom_supabase_anon';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'custom' | 'none';
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (envUrl && envKey && !envUrl.includes('your-project')) {
    return {
      url: envUrl,
      anonKey: envKey,
      isConfigured: true,
      source: 'env',
    };
  }

  const customUrl = (localStorage.getItem(STORAGE_KEY_CUSTOM_URL) || '').trim();
  const customKey = (localStorage.getItem(STORAGE_KEY_CUSTOM_ANON) || '').trim();

  if (customUrl && customKey) {
    return {
      url: customUrl,
      anonKey: customKey,
      isConfigured: true,
      source: 'custom',
    };
  }

  return {
    url: '',
    anonKey: '',
    isConfigured: false,
    source: 'none',
  };
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseInstance;
}

export function saveCustomSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY_CUSTOM_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_CUSTOM_ANON, anonKey.trim());
  supabaseInstance = null; // reset client instance
}

export function clearCustomSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_CUSTOM_URL);
  localStorage.removeItem(STORAGE_KEY_CUSTOM_ANON);
  supabaseInstance = null;
}

export async function testSupabaseConnection(
  testUrl?: string,
  testKey?: string
): Promise<{ success: boolean; message: string; version?: string }> {
  const url = testUrl || getSupabaseConfig().url;
  const key = testKey || getSupabaseConfig().anonKey;

  if (!url || !key) {
    return { success: false, message: 'URL and Anon Key are required.' };
  }

  try {
    const testClient = createClient(url, key);
    // Ping health endpoint or query public schema
    const { error } = await testClient.from('shops').select('id').limit(1);
    if (error && error.code !== 'PGRST116' && !error.message.includes('permission denied')) {
      // If table doesn't exist yet, it's connected to Supabase but migration hasn't been applied
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Connected to Supabase! (Database tables need migration: run the SQL migration in SQL Editor).',
        };
      }
      return { success: false, message: error.message };
    }
    return {
      success: true,
      message: 'Successfully connected and verified against Supabase PostgreSQL database!',
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to reach Supabase endpoint.' };
  }
}
