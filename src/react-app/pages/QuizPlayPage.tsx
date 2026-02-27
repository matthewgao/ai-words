import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Check, RotateCcw, Volume2, X } from "lucide-react";
import { getSupabaseSync } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useSpeak } from "@/hooks/useSpeak";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

interface Word {
	id: number;
	word: string;
	phonetic: string | null;
	definition: string;
}

interface QuizResult {
	wordId: number;
	word: string;
	definition: string;
	isCorrect: boolean;
	userAnswer?: string;
}

function shuffleArray<T>(arr: T[]): T[] {
	const shuffled = [...arr];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

export function QuizPlayPage() {
	const { mode } = useParams<{ mode: string }>();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const speak = useSpeak();

	const unitId = searchParams.get("unitId");
	const source = searchParams.get("source"); // "wrong-words" for wrong book quiz

	const [words, setWords] = useState<Word[]>([]);
	const [currentIdx, setCurrentIdx] = useState(0);
	const [results, setResults] = useState<QuizResult[]>([]);
	const [loading, setLoading] = useState(true);

	// cn_to_en / listen_write
	const [userInput, setUserInput] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [isCorrect, setIsCorrect] = useState(false);

	// flashcard
	const [flipped, setFlipped] = useState(false);

	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		async function loadWords() {
			const supabase = getSupabaseSync();

			if (source === "wrong-words") {
				const importance = searchParams.get("importance");
				let query = supabase
					.from("wrong_words")
					.select("word_id, words(id, word, phonetic, definition)")
					.eq("user_id", user!.id)
					.eq("mastered", false);

				if (importance) {
					query = query.gte("importance", parseInt(importance));
				}

				const { data } = await query;
				const wordList = (data || [])
					.map(
						(r) =>
							r.words as unknown as Word | null,
					)
					.filter((w): w is Word => w !== null);
				setWords(shuffleArray(wordList));
			} else if (unitId) {
				const { data } = await supabase
					.from("words")
					.select("id, word, phonetic, definition")
					.eq("unit_id", Number(unitId))
					.order("id");
				setWords(shuffleArray(data || []));
			}

			setLoading(false);
		}
		loadWords();
	}, [unitId, source, searchParams, user]);

	// 听写模式进入时自动播放
	useEffect(() => {
		if (mode === "listen_write" && words[currentIdx] && !loading) {
			const timer = setTimeout(() => speak(words[currentIdx].word), 300);
			return () => clearTimeout(timer);
		}
	}, [mode, currentIdx, words, loading, speak]);

	useEffect(() => {
		if (!submitted && inputRef.current) inputRef.current.focus();
	}, [currentIdx, submitted]);

	const currentWord = words[currentIdx];
	const progress = words.length > 0 ? ((currentIdx + (submitted || flipped ? 1 : 0)) / words.length) * 100 : 0;

	function handleSubmitAnswer() {
		if (!currentWord || submitted) return;
		const correct =
			userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
		setIsCorrect(correct);
		setSubmitted(true);

		if (!correct) speak(currentWord.word);

		setResults((prev) => [
			...prev,
			{
				wordId: currentWord.id,
				word: currentWord.word,
				definition: currentWord.definition,
				isCorrect: correct,
				userAnswer: userInput.trim(),
			},
		]);
	}

	function handleFlashcardMark(known: boolean) {
		if (!currentWord) return;
		setResults((prev) => [
			...prev,
			{
				wordId: currentWord.id,
				word: currentWord.word,
				definition: currentWord.definition,
				isCorrect: known,
			},
		]);
		goNext();
	}

	function goNext() {
		if (currentIdx + 1 >= words.length) {
			finishQuiz();
			return;
		}
		setCurrentIdx((i) => i + 1);
		setUserInput("");
		setSubmitted(false);
		setIsCorrect(false);
		setFlipped(false);
	}

	async function finishQuiz() {
		const supabase = getSupabaseSync();
		const userId = user!.id;

		// 保存 quiz_records
		const records = results.concat(
			// include current flashcard result if not already added
			mode !== "flashcard" && submitted && currentWord
				? []
				: [],
		);

		if (records.length > 0) {
			await supabase.from("quiz_records").insert(
				records.map((r) => ({
					user_id: userId,
					word_id: r.wordId,
					quiz_type: mode! as "cn_to_en" | "listen_write" | "flashcard",
					is_correct: r.isCorrect,
				})),
			);

			const wrongResults = records.filter((r) => !r.isCorrect);
			const correctResults = records.filter((r) => r.isCorrect);

			for (const r of wrongResults) {
				const { data: existing } = await supabase
					.from("wrong_words")
					.select("id, wrong_count")
					.eq("user_id", userId)
					.eq("word_id", r.wordId)
					.maybeSingle();

				if (existing) {
					await supabase
						.from("wrong_words")
						.update({
							wrong_count: existing.wrong_count + 1,
							correct_streak: 0,
							mastered: false,
							last_wrong_at: new Date().toISOString(),
						})
						.eq("id", existing.id);
				} else {
					await supabase.from("wrong_words").insert({
						user_id: userId,
						word_id: r.wordId,
						wrong_count: 1,
						correct_streak: 0,
						last_wrong_at: new Date().toISOString(),
					});
				}
			}

			for (const r of correctResults) {
				const { data: existing } = await supabase
					.from("wrong_words")
					.select("id, correct_streak")
					.eq("user_id", userId)
					.eq("word_id", r.wordId)
					.maybeSingle();

				if (existing) {
					await supabase
						.from("wrong_words")
						.update({
							correct_streak: existing.correct_streak + 1,
						})
						.eq("id", existing.id);
				}
			}
		}

		// 跳转结果页
		navigate("/quiz/result", {
			state: { results: [...results], mode, total: words.length },
		});
	}

	if (loading) {
		return (
			<div className="flex justify-center py-12">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (words.length === 0) {
		return (
			<div className="flex flex-col items-center py-12 text-muted-foreground">
				<p>没有可背诵的单词</p>
				<Button variant="link" onClick={() => navigate(-1)}>
					返回
				</Button>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-lg space-y-6">
			{/* 进度 */}
			<div className="space-y-2">
				<div className="flex justify-between text-sm text-muted-foreground">
					<span>
						第 {currentIdx + 1} / {words.length} 题
					</span>
					<span>{Math.round(progress)}%</span>
				</div>
				<Progress value={progress} className="h-2" />
			</div>

			{/* 看中文拼英文 */}
			{mode === "cn_to_en" && currentWord && (
				<div className="space-y-6">
					<div className="rounded-xl border bg-card p-8 text-center">
						<p className="text-2xl font-bold">
							{currentWord.definition}
						</p>
						{currentWord.phonetic && submitted && (
							<p className="mt-2 text-muted-foreground">
								{currentWord.phonetic}
							</p>
						)}
					</div>

					<div className="space-y-3">
						<Input
							ref={inputRef}
							value={userInput}
							onChange={(e) => setUserInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									if (submitted) goNext();
									else handleSubmitAnswer();
								}
							}}
							placeholder="输入英文单词..."
							className="text-center text-lg"
							disabled={submitted}
							autoComplete="off"
							spellCheck={false}
						/>

						{submitted && (
							<div
								className={cn(
									"flex items-center justify-center gap-2 rounded-lg p-3 text-sm font-medium",
									isCorrect
										? "bg-green-50 text-green-700"
										: "bg-red-50 text-red-700",
								)}
							>
								{isCorrect ? (
									<>
										<Check className="h-4 w-4" />
										正确！
									</>
								) : (
									<>
										<X className="h-4 w-4" />
										正确答案：{currentWord.word}
										<button
											onClick={() =>
												speak(currentWord.word)
											}
											className="ml-1"
											aria-label="播放发音"
										>
											<Volume2 className="h-4 w-4" />
										</button>
									</>
								)}
							</div>
						)}

						{!submitted ? (
							<Button
								className="w-full"
								onClick={handleSubmitAnswer}
								disabled={!userInput.trim()}
							>
								确认
							</Button>
						) : (
							<Button className="w-full" onClick={goNext}>
								{currentIdx + 1 >= words.length
									? "查看结果"
									: "下一题"}
							</Button>
						)}
					</div>
				</div>
			)}

			{/* 听写 */}
			{mode === "listen_write" && currentWord && (
				<div className="space-y-6">
					<div className="rounded-xl border bg-card p-8 text-center">
						<button
							onClick={() => speak(currentWord.word)}
							className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
							aria-label="播放发音"
						>
							<Volume2 className="h-8 w-8" />
						</button>
						<p className="mt-3 text-sm text-muted-foreground">
							点击播放发音
						</p>
						{submitted && (
							<p className="mt-2 text-muted-foreground">
								{currentWord.definition}
							</p>
						)}
					</div>

					<div className="space-y-3">
						<Input
							ref={inputRef}
							value={userInput}
							onChange={(e) => setUserInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									if (submitted) goNext();
									else handleSubmitAnswer();
								}
							}}
							placeholder="输入听到的单词..."
							className="text-center text-lg"
							disabled={submitted}
							autoComplete="off"
							spellCheck={false}
						/>

						{submitted && (
							<div
								className={cn(
									"flex items-center justify-center gap-2 rounded-lg p-3 text-sm font-medium",
									isCorrect
										? "bg-green-50 text-green-700"
										: "bg-red-50 text-red-700",
								)}
							>
								{isCorrect ? (
									<>
										<Check className="h-4 w-4" />
										正确！
									</>
								) : (
									<>
										<X className="h-4 w-4" />
										正确答案：{currentWord.word}
									</>
								)}
							</div>
						)}

						<div className="flex gap-2">
							{!submitted && (
								<Button
									variant="outline"
									onClick={() => speak(currentWord.word)}
									aria-label="重新播放"
								>
									<RotateCcw className="mr-1 h-4 w-4" />
									重播
								</Button>
							)}
							{!submitted ? (
								<Button
									className="flex-1"
									onClick={handleSubmitAnswer}
									disabled={!userInput.trim()}
								>
									确认
								</Button>
							) : (
								<Button
									className="flex-1"
									onClick={goNext}
								>
									{currentIdx + 1 >= words.length
										? "查看结果"
										: "下一题"}
								</Button>
							)}
						</div>
					</div>
				</div>
			)}

			{/* 闪卡 */}
			{mode === "flashcard" && currentWord && (
				<div className="space-y-6">
					<div
						className="cursor-pointer rounded-xl border bg-card p-8 text-center transition-all hover:shadow-md"
						onClick={() => {
							if (!flipped) setFlipped(true);
						}}
					>
						{!flipped ? (
							<>
								<p className="text-3xl font-bold">
									{currentWord.word}
								</p>
								<p className="mt-4 text-sm text-muted-foreground">
									点击翻转查看释义
								</p>
							</>
						) : (
							<>
								<p className="text-3xl font-bold">
									{currentWord.word}
								</p>
								{currentWord.phonetic && (
									<p className="mt-1 text-muted-foreground">
										{currentWord.phonetic}
									</p>
								)}
								<div className="mt-4 border-t pt-4">
									<p className="text-xl">
										{currentWord.definition}
									</p>
								</div>
								<button
									onClick={(e) => {
										e.stopPropagation();
										speak(currentWord.word);
									}}
									className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
									aria-label="播放发音"
								>
									<Volume2 className="h-4 w-4" />
									播放发音
								</button>
							</>
						)}
					</div>

					{flipped && (
						<div className="flex gap-3">
							<Button
								variant="outline"
								className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
								onClick={() => handleFlashcardMark(false)}
							>
								<X className="mr-1 h-4 w-4" />
								不认识
							</Button>
							<Button
								variant="outline"
								className="flex-1 border-green-200 text-green-600 hover:bg-green-50"
								onClick={() => handleFlashcardMark(true)}
							>
								<Check className="mr-1 h-4 w-4" />
								认识
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
