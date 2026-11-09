import type { FinanceData } from "../types";
import type { SupabaseClient } from "@supabase/supabase-js";
export function publicConfig(
  url?: string,
  key?: string,
): { url: string; key: string } | null;
export function assertWallet(data: unknown): asserts data is FinanceData;
export function migrationPreview(
  personal: FinanceData,
  remote: FinanceData,
): { data: FinanceData; counts: Record<string, number> };
export function importFingerprint(data: FinanceData): Promise<string>;
export function loadCloud(
  client: SupabaseClient,
): Promise<{ wallet: FinanceData; revision: number }>;
export function saveCloud(
  client: SupabaseClient,
  data: FinanceData,
  revision: number,
  importKey?: string | null,
): Promise<number>;
export function cloudError(error: unknown): string;
