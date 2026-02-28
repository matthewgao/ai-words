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
};
