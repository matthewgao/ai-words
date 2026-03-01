const TTS_ENDPOINT =
	"https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/tts";
const TTS_APPKEY = "mfqxNdwYDp03hMWJ";

const TOKEN_DOMAIN = "nls-meta.cn-shanghai.aliyuncs.com";
const TOKEN_API_VERSION = "2019-02-28";

interface AliyunEnv {
	ALIBABA_CLOUD_ACCESS_KEY_ID: string;
	ALIBABA_CLOUD_ACCESS_KEY_SECRET: string;
}

// Module-level token cache (persists across requests in the same isolate)
let cachedToken: string | null = null;
let cachedTokenExpireTime = 0;

function percentEncode(str: string): string {
	return encodeURIComponent(str)
		.replace(/\+/g, "%20")
		.replace(/\*/g, "%2A")
		.replace(/%7E/g, "~");
}

async function hmacSha1Base64(
	key: string,
	data: string,
): Promise<string> {
	const keyBuffer = new TextEncoder().encode(key);
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		keyBuffer,
		{ name: "HMAC", hash: "SHA-1" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign(
		"HMAC",
		cryptoKey,
		new TextEncoder().encode(data),
	);
	return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/**
 * 通过阿里云 OpenAPI（RPC 风格）获取 NLS Token。
 * 使用 HMAC-SHA1 签名 + fetch，无需 SDK。
 */
async function fetchToken(env: AliyunEnv): Promise<{ token: string; expireTime: number }> {
	const params: Record<string, string> = {
		Action: "CreateToken",
		Version: TOKEN_API_VERSION,
		Format: "JSON",
		AccessKeyId: env.ALIBABA_CLOUD_ACCESS_KEY_ID,
		SignatureMethod: "HMAC-SHA1",
		Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
		SignatureVersion: "1.0",
		SignatureNonce: crypto.randomUUID(),
	};

	const sortedKeys = Object.keys(params).sort();
	const canonicalQuery = sortedKeys
		.map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
		.join("&");

	const stringToSign = `POST&${percentEncode("/")}&${percentEncode(canonicalQuery)}`;
	const signature = await hmacSha1Base64(
		env.ALIBABA_CLOUD_ACCESS_KEY_SECRET + "&",
		stringToSign,
	);

	params.Signature = signature;

	const body = Object.entries(params)
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
		.join("&");

	const res = await fetch(`https://${TOKEN_DOMAIN}/`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body,
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`获取 TTS Token 失败: ${res.status} - ${text}`);
	}

	const data: { Token?: { Id?: string; ExpireTime?: number } } = await res.json();
	if (!data.Token?.Id) {
		throw new Error("获取 TTS Token 失败: 返回数据中无 Token");
	}

	return { token: data.Token.Id, expireTime: data.Token.ExpireTime ?? 0 };
}

/**
 * 获取有效的 TTS Token，自动缓存和刷新。
 * Token 在过期前 5 分钟提前刷新。
 */
export async function getToken(env: AliyunEnv): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	if (cachedToken && cachedTokenExpireTime > now + 300) {
		return cachedToken;
	}

	const { token, expireTime } = await fetchToken(env);
	cachedToken = token;
	cachedTokenExpireTime = expireTime;
	return token;
}

interface TtsOptions {
	voice?: string;
	format?: string;
	sampleRate?: number;
	volume?: number;
	speechRate?: number;
	pitchRate?: number;
}

/**
 * 调用阿里云 TTS REST API，返回合成的音频二进制数据。
 * 成功时 Content-Type 为 audio/mpeg 等，body 为音频流。
 * 失败时 body 为 JSON 错误信息。
 */
export async function synthesizeSpeech(
	token: string,
	text: string,
	options: TtsOptions = {},
): Promise<Response> {
	const body = JSON.stringify({
		appkey: TTS_APPKEY,
		token,
		text,
		format: options.format ?? "mp3",
		sample_rate: options.sampleRate ?? 16000,
		voice: options.voice ?? "siyue",
		volume: options.volume ?? 50,
		speech_rate: options.speechRate ?? -100,
		pitch_rate: options.pitchRate ?? 0,
	});

	const res = await fetch(TTS_ENDPOINT, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body,
	});

	return res;
}
