// Secrets 不在 wrangler.json vars 中声明，需手动补充类型
declare interface Env {
	SUPABASE_SERVICE_ROLE_KEY: string;
	ALIBABA_CLOUD_ACCESS_KEY_ID: string;
	ALIBABA_CLOUD_ACCESS_KEY_SECRET: string;
}
