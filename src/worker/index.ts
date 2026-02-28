import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient } from "@supabase/supabase-js";
import { recognizeAdvanced, extractEnglishWords } from "./aliyun-ocr";

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors());

// 前端通过此接口获取 Supabase 公开配置
app.get("/api/config", (c) => {
	return c.json({
		supabaseUrl: c.env.SUPABASE_URL,
		supabaseAnonKey: c.env.SUPABASE_ANON_KEY,
	});
});

// 管理员身份校验中间件
async function requireAdmin(c: {
	env: Env;
	req: { header: (name: string) => string | undefined };
	json: (data: unknown, status: number) => Response;
}) {
	const authHeader = c.req.header("Authorization");
	if (!authHeader) return c.json({ error: "未登录" }, 401);

	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

	const token = authHeader.replace("Bearer ", "");
	const { data: { user }, error } = await supabase.auth.getUser(token);
	if (error || !user) return c.json({ error: "认证失败" }, 401);

	const { data: profile } = await supabase
		.from("profiles")
		.select("role")
		.eq("id", user.id)
		.single();

	if (profile?.role !== "admin") return c.json({ error: "需要管理员权限" }, 403);
	return null;
}

// 词典代理 API
app.get("/api/dict/lookup", async (c) => {
	const word = c.req.query("word");
	if (!word) return c.json({ error: "缺少 word 参数" }, 400);

	try {
		const res = await fetch(
			`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
		);
		if (!res.ok) return c.json({ error: "单词未找到" }, 404);

		const data: Array<{
			word: string;
			phonetic?: string;
			phonetics?: Array<{ text?: string; audio?: string }>;
			meanings?: Array<{
				partOfSpeech: string;
				definitions: Array<{ definition: string }>;
			}>;
		}> = await res.json();

		const entry = data[0];
		const phonetic =
			entry?.phonetic ||
			entry?.phonetics?.find((p) => p.text)?.text ||
			"";
		const meanings =
			entry?.meanings?.map((m) => ({
				partOfSpeech: m.partOfSpeech,
				definition: m.definitions[0]?.definition || "",
			})) || [];

		// 尝试将第一个英文释义翻译成中文
		let chineseDefinition = "";
		const firstDef = meanings[0]?.definition;
		if (firstDef) {
			try {
				const transRes = await fetch(
					`https://api.mymemory.translated.net/get?q=${encodeURIComponent(firstDef)}&langpair=en|zh-CN`,
				);
				if (transRes.ok) {
					const transData: {
						responseData?: { translatedText?: string };
					} = await transRes.json();
					chineseDefinition =
						transData.responseData?.translatedText || "";
				}
			} catch {
				// 翻译失败不阻塞
			}
		}

		return c.json({
			word: entry?.word,
			phonetic,
			meanings,
			chineseDefinition,
		});
	} catch {
		return c.json({ error: "查询失败" }, 500);
	}
});

// ============ 管理员 CRUD API ============

// 学年
app.post("/api/admin/grades", async (c) => {
	const denied = await requireAdmin(c);
	if (denied) return denied;

	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
	const body = await c.req.json<{ name: string; sort_order?: number }>();
	const { data, error } = await supabase.from("grades").insert(body).select().single();
	if (error) return c.json({ error: error.message }, 400);
	return c.json(data, 201);
});

app.put("/api/admin/grades/:id", async (c) => {
	const denied = await requireAdmin(c);
	if (denied) return denied;

	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
	const id = c.req.param("id");
	const body = await c.req.json<{ name?: string; sort_order?: number }>();
	const { data, error } = await supabase
		.from("grades")
		.update(body)
		.eq("id", id)
		.select()
		.single();
	if (error) return c.json({ error: error.message }, 400);
	return c.json(data);
});

app.delete("/api/admin/grades/:id", async (c) => {
	const denied = await requireAdmin(c);
	if (denied) return denied;

	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
	const id = c.req.param("id");
	const { error } = await supabase.from("grades").delete().eq("id", id);
	if (error) return c.json({ error: error.message }, 400);
	return c.json({ ok: true });
});

// 单元
app.post("/api/admin/units", async (c) => {
	const denied = await requireAdmin(c);
	if (denied) return denied;

	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
	const body = await c.req.json<{ grade_id: number; name: string; sort_order?: number }>();
	const { data, error } = await supabase.from("units").insert(body).select().single();
	if (error) return c.json({ error: error.message }, 400);
	return c.json(data, 201);
});

app.put("/api/admin/units/:id", async (c) => {
	const denied = await requireAdmin(c);
	if (denied) return denied;

	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
	const id = c.req.param("id");
	const body = await c.req.json<{ name?: string; sort_order?: number }>();
	const { data, error } = await supabase
		.from("units")
		.update(body)
		.eq("id", id)
		.select()
		.single();
	if (error) return c.json({ error: error.message }, 400);
	return c.json(data);
});

app.delete("/api/admin/units/:id", async (c) => {
	const denied = await requireAdmin(c);
	if (denied) return denied;

	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
	const id = c.req.param("id");
	const { error } = await supabase.from("units").delete().eq("id", id);
	if (error) return c.json({ error: error.message }, 400);
	return c.json({ ok: true });
});

// 单词
app.post("/api/admin/words", async (c) => {
	const denied = await requireAdmin(c);
	if (denied) return denied;

	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
	const body = await c.req.json<{
		unit_id: number;
		word: string;
		phonetic?: string;
		definition: string;
	}>();
	const { data, error } = await supabase.from("words").insert(body).select().single();
	if (error) return c.json({ error: error.message }, 400);
	return c.json(data, 201);
});

app.post("/api/admin/words/batch", async (c) => {
	const denied = await requireAdmin(c);
	if (denied) return denied;

	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
	const body = await c.req.json<{
		words: Array<{
			unit_id: number;
			word: string;
			phonetic?: string;
			definition: string;
		}>;
	}>();
	const { data, error } = await supabase.from("words").insert(body.words).select();
	if (error) return c.json({ error: error.message }, 400);
	return c.json(data, 201);
});

// OCR 图片识别
app.post("/api/admin/ocr/recognize", async (c) => {
	const denied = await requireAdmin(c);
	if (denied) return denied;

	try {
		const formData = await c.req.formData();
		const file = formData.get("image");
		if (!file || !(file instanceof File)) {
			return c.json({ error: "缺少图片文件" }, 400);
		}

		const imageBytes = await file.arrayBuffer();
		const rawText = await recognizeAdvanced(c.env, imageBytes);
		const words = extractEnglishWords(rawText);

		return c.json({ words, rawText });
	} catch (err) {
		const message = err instanceof Error ? err.message : "OCR 识别失败";
		return c.json({ error: message }, 500);
	}
});

app.put("/api/admin/words/:id", async (c) => {
	const denied = await requireAdmin(c);
	if (denied) return denied;

	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
	const id = c.req.param("id");
	const body = await c.req.json<{
		word?: string;
		phonetic?: string;
		definition?: string;
	}>();
	const { data, error } = await supabase
		.from("words")
		.update(body)
		.eq("id", id)
		.select()
		.single();
	if (error) return c.json({ error: error.message }, 400);
	return c.json(data);
});

app.delete("/api/admin/words/:id", async (c) => {
	const denied = await requireAdmin(c);
	if (denied) return denied;

	const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
	const id = c.req.param("id");
	const { error } = await supabase.from("words").delete().eq("id", id);
	if (error) return c.json({ error: error.message }, 400);
	return c.json({ ok: true });
});

export default app;
