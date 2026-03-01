import { getSupabaseSync } from "./supabase";

async function getAuthHeaders(): Promise<Record<string, string>> {
	const supabase = getSupabaseSync();
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session?.access_token) return {};
	return { Authorization: `Bearer ${session.access_token}` };
}

async function request<T>(
	url: string,
	options: RequestInit = {},
): Promise<T> {
	const headers = await getAuthHeaders();
	const res = await fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...headers,
			...options.headers,
		},
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(
			(body as { error?: string }).error || `请求失败 (${res.status})`,
		);
	}
	return res.json();
}

export const api = {
	// 学年
	createGrade: (data: { name: string; sort_order?: number }) =>
		request("/api/admin/grades", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	updateGrade: (id: number, data: { name?: string; sort_order?: number }) =>
		request(`/api/admin/grades/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	deleteGrade: (id: number) =>
		request(`/api/admin/grades/${id}`, { method: "DELETE" }),

	// 单元
	createUnit: (data: {
		grade_id: number;
		name: string;
		sort_order?: number;
	}) =>
		request("/api/admin/units", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	updateUnit: (id: number, data: { name?: string; sort_order?: number }) =>
		request(`/api/admin/units/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	deleteUnit: (id: number) =>
		request(`/api/admin/units/${id}`, { method: "DELETE" }),

	// 单词
	createWord: (data: {
		unit_id: number;
		word: string;
		phonetic?: string;
		definition: string;
	}) =>
		request("/api/admin/words", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	createWordsBatch: (
		words: Array<{
			unit_id: number;
			word: string;
			phonetic?: string;
			definition: string;
		}>,
	) =>
		request("/api/admin/words/batch", {
			method: "POST",
			body: JSON.stringify({ words }),
		}),
	updateWord: (
		id: number,
		data: { word?: string; phonetic?: string; definition?: string },
	) =>
		request(`/api/admin/words/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	deleteWord: (id: number) =>
		request(`/api/admin/words/${id}`, { method: "DELETE" }),

	// 词典查询
	lookupWord: (word: string) =>
		request<{
			word: string;
			phonetic: string;
			meanings: Array<{ partOfSpeech: string; definition: string }>;
			chineseDefinition: string;
		}>(`/api/dict/lookup?word=${encodeURIComponent(word)}`),

	// OCR 图片识别
	ocrRecognize: async (image: File): Promise<{ words: string[]; rawText: string }> => {
		const headers = await getAuthHeaders();
		const formData = new FormData();
		formData.append("image", image);
		const res = await fetch("/api/admin/ocr/recognize", {
			method: "POST",
			headers,
			body: formData,
		});
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			throw new Error(
				(body as { error?: string }).error || `OCR 识别失败 (${res.status})`,
			);
		}
		return res.json();
	},

	// ============ 语文 ============

	// 语文学年
	createCnGrade: (data: { name: string; sort_order?: number }) =>
		request("/api/admin/chinese/grades", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	updateCnGrade: (id: number, data: { name?: string; sort_order?: number }) =>
		request(`/api/admin/chinese/grades/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	deleteCnGrade: (id: number) =>
		request(`/api/admin/chinese/grades/${id}`, { method: "DELETE" }),

	// 语文单元
	createCnUnit: (data: {
		grade_id: number;
		name: string;
		sort_order?: number;
	}) =>
		request("/api/admin/chinese/units", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	updateCnUnit: (id: number, data: { name?: string; sort_order?: number }) =>
		request(`/api/admin/chinese/units/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	deleteCnUnit: (id: number) =>
		request(`/api/admin/chinese/units/${id}`, { method: "DELETE" }),

	// 语文词汇
	createCnWord: (data: { unit_id: number; word: string }) =>
		request("/api/admin/chinese/words", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	createCnWordsBatch: (words: Array<{ unit_id: number; word: string }>) =>
		request("/api/admin/chinese/words/batch", {
			method: "POST",
			body: JSON.stringify({ words }),
		}),
	updateCnWord: (id: number, data: { word?: string }) =>
		request(`/api/admin/chinese/words/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	deleteCnWord: (id: number) =>
		request(`/api/admin/chinese/words/${id}`, { method: "DELETE" }),

	// 语文 OCR 图片识别
	cnOcrRecognize: async (image: File): Promise<{ words: string[]; rawText: string }> => {
		const headers = await getAuthHeaders();
		const formData = new FormData();
		formData.append("image", image);
		const res = await fetch("/api/admin/chinese/ocr/recognize", {
			method: "POST",
			headers,
			body: formData,
		});
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			throw new Error(
				(body as { error?: string }).error || `OCR 识别失败 (${res.status})`,
			);
		}
		return res.json();
	},

	// TTS 语音合成
	ttsSpeak: async (text: string): Promise<ArrayBuffer> => {
		const headers = await getAuthHeaders();
		const res = await fetch("/api/tts", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...headers,
			},
			body: JSON.stringify({ text }),
		});
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			throw new Error(
				(body as { error?: string }).error || `TTS 合成失败 (${res.status})`,
			);
		}
		return res.arrayBuffer();
	},
};
