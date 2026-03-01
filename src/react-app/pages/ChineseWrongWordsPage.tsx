import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Mic, Trash2 } from "lucide-react";
import { getSupabaseSync } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";

interface CnWrongWord {
	id: number;
	word_id: number;
	wrong_count: number;
	correct_streak: number;
	importance: number;
	mastered: boolean;
	word: string;
}

const importanceLabels: Record<
	number,
	{ label: string; variant: "destructive" | "warning" | "secondary" }
> = {
	3: { label: "非常重要", variant: "destructive" },
	2: { label: "重要", variant: "warning" },
	1: { label: "普通", variant: "secondary" },
};

export function ChineseWrongWordsPage() {
	const { user } = useAuth();
	const navigate = useNavigate();

	const [wrongWords, setWrongWords] = useState<CnWrongWord[]>([]);
	const [loading, setLoading] = useState(true);
	const [tab, setTab] = useState("all");

	useEffect(() => {
		async function load() {
			const supabase = getSupabaseSync();
			const { data } = await supabase
				.from("cn_wrong_words")
				.select(
					"id, word_id, wrong_count, correct_streak, importance, mastered, cn_words(word)",
				)
				.eq("user_id", user!.id)
				.eq("mastered", false)
				.order("importance", { ascending: false });

			const result: CnWrongWord[] = (data || []).map((r) => {
				const w = r.cn_words as unknown as { word: string };
				return {
					id: r.id,
					word_id: r.word_id,
					wrong_count: r.wrong_count,
					correct_streak: r.correct_streak,
					importance: r.importance,
					mastered: r.mastered,
					word: w.word,
				};
			});

			setWrongWords(result);
			setLoading(false);
		}
		load();
	}, [user]);

	async function handleDelete(id: number) {
		const supabase = getSupabaseSync();
		await supabase.from("cn_wrong_words").delete().eq("id", id);
		setWrongWords((prev) => prev.filter((w) => w.id !== id));
	}

	function startDictation(minImportance?: number) {
		const params = new URLSearchParams({ source: "wrong-words" });
		if (minImportance) params.set("importance", String(minImportance));
		navigate(`/chinese/dictation?${params.toString()}`);
	}

	const filteredWords =
		tab === "all"
			? wrongWords
			: wrongWords.filter((w) => w.importance === parseInt(tab));

	if (loading) {
		return (
			<div className="flex justify-center py-12">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						语文错题本
					</h1>
					<p className="text-muted-foreground">
						{wrongWords.length} 个未掌握的词语
					</p>
				</div>
				{wrongWords.length > 0 && (
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => startDictation(2)}
						>
							<AlertTriangle className="mr-1 h-4 w-4" />
							重点默写
						</Button>
						<Button
							size="sm"
							onClick={() => startDictation()}
						>
							<Mic className="mr-1 h-4 w-4" />
							全部默写
						</Button>
					</div>
				)}
			</div>

			{wrongWords.length === 0 ? (
				<div className="flex flex-col items-center py-12 text-muted-foreground">
					<Mic className="mb-2 h-10 w-10" />
					<p>还没有错题，继续保持！</p>
				</div>
			) : (
				<Tabs value={tab} onValueChange={setTab}>
					<TabsList>
						<TabsTrigger value="all">
							全部 ({wrongWords.length})
						</TabsTrigger>
						<TabsTrigger value="3">
							非常重要 (
							{
								wrongWords.filter((w) => w.importance === 3)
									.length
							}
							)
						</TabsTrigger>
						<TabsTrigger value="2">
							重要 (
							{
								wrongWords.filter((w) => w.importance === 2)
									.length
							}
							)
						</TabsTrigger>
						<TabsTrigger value="1">
							普通 (
							{
								wrongWords.filter((w) => w.importance === 1)
									.length
							}
							)
						</TabsTrigger>
					</TabsList>

					<TabsContent value={tab}>
						<div className="divide-y rounded-lg border">
							{filteredWords.map((w) => {
								const imp = importanceLabels[w.importance];
								return (
									<div
										key={w.id}
										className="flex items-center gap-3 px-4 py-3"
									>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className="font-medium text-lg">
													{w.word}
												</span>
												<Badge
													variant={imp.variant}
													className="text-xs"
												>
													{imp.label}
												</Badge>
											</div>
										</div>
										<span className="text-xs text-muted-foreground whitespace-nowrap">
											错 {w.wrong_count} 次
										</span>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground hover:text-destructive"
											onClick={() =>
												handleDelete(w.id)
											}
											aria-label={`删除 ${w.word}`}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								);
							})}
							{filteredWords.length === 0 && (
								<p className="py-8 text-center text-sm text-muted-foreground">
									该分类下没有错题
								</p>
							)}
						</div>
					</TabsContent>
				</Tabs>
			)}
		</div>
	);
}
