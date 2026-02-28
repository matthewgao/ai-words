const ENDPOINT = "ocr-api.cn-hangzhou.aliyuncs.com";
const API_VERSION = "2021-07-07";

async function sha256Hex(data: ArrayBuffer | string): Promise<string> {
	const buffer =
		typeof data === "string" ? new TextEncoder().encode(data) : data;
	const hash = await crypto.subtle.digest("SHA-256", buffer);
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

async function hmacSha256(
	key: ArrayBuffer | string,
	data: string,
): Promise<ArrayBuffer> {
	const keyBuffer =
		typeof key === "string" ? new TextEncoder().encode(key) : key;
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		keyBuffer,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	return crypto.subtle.sign(
		"HMAC",
		cryptoKey,
		new TextEncoder().encode(data),
	);
}

function toHex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

interface AliyunEnv {
	ALIBABA_CLOUD_ACCESS_KEY_ID: string;
	ALIBABA_CLOUD_ACCESS_KEY_SECRET: string;
}

/**
 * 调用阿里云 OCR RecognizeAdvanced API，返回识别出的文本内容。
 * 使用 ACS v3 签名，通过 fetch 直接调用 REST API，无需 SDK。
 */
export async function recognizeAdvanced(
	env: AliyunEnv,
	imageBytes: ArrayBuffer,
): Promise<string> {
	const method = "POST";
	const canonicalUri = "/";
	const canonicalQueryString = "";

	const date = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
	const nonce = crypto.randomUUID();
	const bodyHash = await sha256Hex(imageBytes);

	const headers: Record<string, string> = {
		host: ENDPOINT,
		"x-acs-action": "RecognizeAdvanced",
		"x-acs-content-sha256": bodyHash,
		"x-acs-date": date,
		"x-acs-signature-nonce": nonce,
		"x-acs-version": API_VERSION,
	};

	const signedHeaderKeys = Object.keys(headers).sort();
	const canonicalHeaders = signedHeaderKeys
		.map((k) => `${k}:${headers[k]}\n`)
		.join("");
	const signedHeaders = signedHeaderKeys.join(";");

	const canonicalRequest = [
		method,
		canonicalUri,
		canonicalQueryString,
		canonicalHeaders,
		signedHeaders,
		bodyHash,
	].join("\n");

	const hashedCanonicalRequest = await sha256Hex(canonicalRequest);
	const stringToSign = `ACS3-HMAC-SHA256\n${hashedCanonicalRequest}`;

	const signature = toHex(
		await hmacSha256(env.ALIBABA_CLOUD_ACCESS_KEY_SECRET, stringToSign),
	);

	const authorization = `ACS3-HMAC-SHA256 Credential=${env.ALIBABA_CLOUD_ACCESS_KEY_ID},SignedHeaders=${signedHeaders},Signature=${signature}`;

	const response = await fetch(`https://${ENDPOINT}/`, {
		method: "POST",
		headers: {
			...headers,
			"Content-Type": "application/octet-stream",
			Authorization: authorization,
		},
		body: imageBytes,
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`OCR 识别失败: ${response.status} - ${text}`);
	}

	const result: { Data?: string } = await response.json();
	if (!result.Data) return "";

	try {
		const parsed: { content?: string } = JSON.parse(result.Data);
		return parsed.content || result.Data;
	} catch {
		return result.Data;
	}
}

/**
 * 从 OCR 文本中提取英文单词，去重后按字母排序返回。
 * 仅保留纯字母、长度 >= 2 的 token。
 */
export function extractEnglishWords(text: string): string[] {
	const tokens = text.split(/[^a-zA-Z]+/);
	const seen = new Set<string>();
	const words: string[] = [];

	for (const token of tokens) {
		const clean = token.toLowerCase();
		if (clean.length < 2) continue;
		if (seen.has(clean)) continue;
		seen.add(clean);
		words.push(clean);
	}

	return words.sort();
}
