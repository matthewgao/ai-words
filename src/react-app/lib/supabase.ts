import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let supabaseInstance: SupabaseClient<Database> | null = null;

export async function getSupabase() {
	if (supabaseInstance) return supabaseInstance;

	const res = await fetch("/api/config");
	const config: { supabaseUrl: string; supabaseAnonKey: string } =
		await res.json();

	if (!config.supabaseUrl || !config.supabaseAnonKey) {
		throw new Error(
			"Supabase 配置缺失。请在 .dev.vars 中设置 SUPABASE_URL 和 SUPABASE_ANON_KEY",
		);
	}

	supabaseInstance = createClient<Database>(
		config.supabaseUrl,
		config.supabaseAnonKey,
	);
	return supabaseInstance;
}

export function getSupabaseSync() {
	if (!supabaseInstance) {
		throw new Error("Supabase not initialized. Call getSupabase() first.");
	}
	return supabaseInstance;
}
