import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Loader2, RotateCcw, X } from "lucide-react";
import { getSupabaseSync } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DictationWord {
	id: number;
	word: string;
}

export function ChineseDictationResultPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const { user } = useAuth();

	const allWords: DictationWord[] = (location.state as { words?: DictationWord[] })?.words || [];
	const [wrongIds, setWrongIds] = useState<Set<number>>(new Set());
	const [submitting, setSubmitting] = useState(false);
	const [submitted, setSubmitted] = useState(false);

	if (allWords.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-20">
				<p className="text-muted-foreground">没有默写记录</p>
				<Button onClick={() => navigate("/chinese/dictation")}>
					返回默写
				</Button>
			</div>
		);
	}

	function toggleWrong(wordId: number) {
		setWrongIds((prev) => {
			const next = new Set(prev);
			if (next.has(wordId)) next.delete(wordId);
			else next.add(wordId);
			return next;
		});
	}

	async function handleSubmit() {
		if (!user) return;
		setSubmitting(true);
		try {
			const supabase = getSupabaseSync();

			// Record each word in cn_dictation_records
			const records = allWords.map((w) => ({
				user_id: user.id,
				word_id: w.id,
				is_correct: !wrongIds.has(w.id),
			}));
			await supabase.from("cn_dictation_records").insert(records);

			// Process wrong words
			for (const w of allWords) {
				const isWrong = wrongIds.has(w.id);

				if (isWrong) {
					const { data: existing } = await supabase
						.from("cn_wrong_words")
						.select("id, wrong_count")
						.eq("user_id", user.id)
						.eq("word_id", w.id)
						.maybeSingle();

					if (existing) {
						await supabase
							.from("cn_wrong_words")
							.update({
								wrong_count: existing.wrong_count + 1,
								correct_streak: 0,
								last_wrong_at: new Date().toISOString(),
							})
							.eq("id", existing.id);
					} else {
						await supabase.from("cn_wrong_words").insert({
							user_id: user.id,
							word_id: w.id,
							wrong_count: 1,
							correct_streak: 0,
							last_wrong_at: new Date().toISOString(),
						});
					}
				} else {
					// Correct: increment correct_streak if exists
					const { data: existing } = await supabase
						.from("cn_wrong_words")
						.select("id, correct_streak")
						.eq("user_id", user.id)
						.eq("word_id", w.id)
						.maybeSingle();

					if (existing) {
						await supabase
							.from("cn_wrong_words")
							.update({
								correct_streak: existing.correct_streak + 1,
							})
							.eq("id", existing.id);
					}
				}
			}

			setSubmitted(true);
		} finally {
			setSubmitting(false);
		}
	}

	const correctCount = allWords.length - wrongIds.size;
	const accuracy =
		allWords.length > 0
			? Math.round((correctCount / allWords.length) * 100)
			: 0;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">
					默写结果
				</h1>
				<p className="text-muted-foreground">
					{submitted
						? "结果已提交"
						: "请对照自己的默写，标记出写错的词语"}
				</p>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-3 gap-4">
				<div className="rounded-lg border bg-card p-4 text-center">
					<p className="text-2xl font-bold">{allWords.length}</p>
					<p className="text-xs text-muted-foreground">总词数</p>
				</div>
				<div className="rounded-lg border bg-card p-4 text-center">
					<p className="text-2xl font-bold text-green-600">
						{correctCount}
					</p>
					<p className="text-xs text-muted-foreground">正确</p>
				</div>
				<div className="rounded-lg border bg-card p-4 text-center">
					<p
						className={cn(
							"text-2xl font-bold",
							wrongIds.size > 0
								? "text-red-500"
								: "text-green-600",
						)}
					>
						{accuracy}%
					</p>
					<p className="text-xs text-muted-foreground">正确率</p>
				</div>
			</div>

			{/* Word grid */}
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
				{allWords.map((w) => {
					const isWrong = wrongIds.has(w.id);
					return (
						<button
							key={w.id}
							type="button"
							disabled={submitted}
							onClick={() => toggleWrong(w.id)}
							className={cn(
								"flex items-center justify-between rounded-lg border p-3 text-left transition-colors",
								submitted
									? isWrong
										? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950"
										: "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950"
									: isWrong
										? "border-red-400 bg-red-50 hover:bg-red-100 dark:border-red-700 dark:bg-red-950 dark:hover:bg-red-900"
										: "hover:bg-muted/50",
							)}
						>
							<span
								className={cn(
									"font-medium",
									isWrong && "text-red-600 dark:text-red-400",
								)}
							>
								{w.word}
							</span>
							{isWrong ? (
								<X className="h-4 w-4 text-red-500 shrink-0" />
							) : (
								<Check className="h-4 w-4 text-green-500 shrink-0" />
							)}
						</button>
					);
				})}
			</div>

			{!submitted && (
				<p className="text-sm text-muted-foreground text-center">
					点击词语可标记为"错误"，再次点击取消
				</p>
			)}

			{/* Actions */}
			<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
				{!submitted ? (
					<Button
						size="lg"
						onClick={handleSubmit}
						disabled={submitting}
					>
						{submitting && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						提交结果
					</Button>
				) : (
					<>
						<Button
							variant="outline"
							onClick={() => navigate(-1)}
						>
							<RotateCcw className="mr-2 h-4 w-4" />
							再次默写
						</Button>
						<Button
							variant="outline"
							onClick={() =>
								navigate("/chinese/dictation")
							}
						>
							返回选择
						</Button>
						{wrongIds.size > 0 && (
							<Button
								onClick={() =>
									navigate("/chinese/wrong-words")
								}
							>
								查看错题本
							</Button>
						)}
					</>
				)}
			</div>
		</div>
	);
}
