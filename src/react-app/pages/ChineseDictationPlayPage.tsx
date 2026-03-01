import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, RotateCcw, SkipForward, Volume2 } from "lucide-react";
import { getSupabaseSync } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useChineseTts } from "@/hooks/useChineseTts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface CnWord {
	id: number;
	word: string;
}

type PlayState = "loading" | "reading" | "waiting" | "finished";

function shuffleArray<T>(arr: T[]): T[] {
	const shuffled = [...arr];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

export function ChineseDictationPlayPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const { speak, preload, stop } = useChineseTts();

	const [words, setWords] = useState<CnWord[]>([]);
	const [currentIdx, setCurrentIdx] = useState(0);
	const [readCount, setReadCount] = useState(0);
	const [playState, setPlayState] = useState<PlayState>("loading");
	const [loading, setLoading] = useState(true);
	const [showEndDialog, setShowEndDialog] = useState(false);

	// Generation counter: incremented each time a new readCurrentWord starts.
	// Old async invocations check this to know they've been superseded.
	const generationRef = useRef(0);
	// Tracks the highest word index that TTS has actually started reading.
	// More reliable than currentIdx (React state) for determining what the user heard.
	const maxReadIdxRef = useRef(-1);

	const unitIds = searchParams.get("unitIds");
	const source = searchParams.get("source");
	const importance = searchParams.get("importance");

	useEffect(() => {
		let ignore = false;

		async function loadWords() {
			const supabase = getSupabaseSync();

			if (source === "wrong-words") {
				let query = supabase
					.from("cn_wrong_words")
					.select("word_id, cn_words(id, word)")
					.eq("user_id", user!.id)
					.eq("mastered", false);

				if (importance) {
					query = query.gte("importance", parseInt(importance));
				}

				const { data } = await query;
				if (ignore) return;
				const wordList = (data || [])
					.map(
						(r) =>
							r.cn_words as unknown as CnWord | null,
					)
					.filter((w): w is CnWord => w !== null);
				setWords(shuffleArray(wordList));
			} else if (unitIds) {
				const ids = unitIds.split(",").map(Number);
				const { data } = await supabase
					.from("cn_words")
					.select("id, word")
					.in("unit_id", ids)
					.order("id");
				if (ignore) return;
				setWords(shuffleArray(data || []));
			}

			setLoading(false);
		}
		loadWords();

		return () => {
			ignore = true;
			generationRef.current++;
			stop();
		};
	}, [unitIds, source, importance, user, stop]);

	const sleep = useCallback(
		(ms: number, gen: number) =>
			new Promise<void>((resolve) => {
				const timer = setTimeout(resolve, ms);
				const check = setInterval(() => {
					if (generationRef.current !== gen) {
						clearTimeout(timer);
						clearInterval(check);
						resolve();
					}
				}, 100);
			}),
		[],
	);

	const readCurrentWord = useCallback(
		async (idx: number) => {
			const gen = ++generationRef.current;

			if (idx >= words.length) return;

			if (idx > maxReadIdxRef.current) {
				maxReadIdxRef.current = idx;
			}

			setPlayState("reading");
			setReadCount(0);

			if (idx + 1 < words.length) {
				preload(words[idx + 1].word);
			}

			const word = words[idx].word;

			for (let i = 0; i < 3; i++) {
				if (generationRef.current !== gen) return;
				setReadCount(i + 1);
				try {
					await speak(word);
				} catch {
					// TTS failure — continue
				}
				if (i < 2 && generationRef.current === gen) {
					await sleep(3000, gen);
				}
			}

			if (generationRef.current === gen) {
				setPlayState("waiting");
			}
		},
		[words, speak, preload, sleep],
	);

	// Start reading when words are loaded
	const startedRef = useRef(false);
	useEffect(() => {
		if (!loading && words.length > 0 && !startedRef.current) {
			startedRef.current = true;
			const timer = setTimeout(() => readCurrentWord(0), 0);
			return () => {
				clearTimeout(timer);
				startedRef.current = false;
			};
		}
	}, [loading, words, readCurrentWord]);

	const handleNext = useCallback(() => {
		if (playState !== "waiting" && playState !== "reading") return;

		stop();

		const nextIdx = currentIdx + 1;
		if (nextIdx >= words.length) {
			generationRef.current++;
			setPlayState("finished");
			navigate("/chinese/dictation/result", {
				state: { words: words.map((w) => ({ id: w.id, word: w.word })) },
				replace: true,
			});
			return;
		}

		setCurrentIdx(nextIdx);
		readCurrentWord(nextIdx);
	}, [playState, currentIdx, words, stop, navigate, readCurrentWord]);

	const handleReread = useCallback(() => {
		if (currentIdx >= words.length) return;
		stop();
		readCurrentWord(currentIdx);
	}, [currentIdx, words, stop, readCurrentWord]);

	const handleEndEarly = useCallback(() => {
		stop();
		generationRef.current++;
		setPlayState("finished");
		const endIdx = maxReadIdxRef.current;
		const dictatedWords = endIdx >= 0 ? words.slice(0, endIdx + 1) : [];
		navigate("/chinese/dictation/result", {
			state: { words: dictatedWords.map((w) => ({ id: w.id, word: w.word })) },
			replace: true,
		});
	}, [words, stop, navigate]);

	// Keyboard: space = next (disabled while end-dialog is open)
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (showEndDialog) return;
			if (e.code === "Space") {
				e.preventDefault();
				handleNext();
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleNext, showEndDialog]);

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-20">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				<p className="text-muted-foreground">加载词汇中...</p>
			</div>
		);
	}

	if (words.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-20">
				<p className="text-muted-foreground">没有找到词汇</p>
				<Button
					variant="outline"
					onClick={() => navigate("/chinese/dictation")}
				>
					返回
				</Button>
			</div>
		);
	}

	const progress = ((currentIdx + 1) / words.length) * 100;

	return (
		<div className="mx-auto max-w-md space-y-8 py-8">
			{/* Progress */}
			<div className="space-y-2">
				<div className="flex justify-between text-sm text-muted-foreground">
					<span>
						第 {currentIdx + 1} / {words.length} 个
					</span>
					<span>{Math.round(progress)}%</span>
				</div>
				<Progress value={progress} />
			</div>

			{/* Main display */}
			<div className="flex flex-col items-center gap-6 rounded-xl border bg-card p-8 shadow-sm">
				<div className="flex items-center gap-3">
					<Volume2
						className={`h-10 w-10 ${
							playState === "reading"
								? "text-primary animate-pulse"
								: "text-muted-foreground"
						}`}
					/>
					{playState === "reading" && (
						<span className="text-lg font-medium text-primary">
							第 {readCount} 遍
						</span>
					)}
				</div>

				{playState === "reading" && (
					<p className="text-sm text-muted-foreground">
						正在朗读...请认真听并默写
					</p>
				)}

				{playState === "waiting" && (
					<p className="text-sm text-muted-foreground">
						朗读完毕，请按空格键或点击下方按钮继续
					</p>
				)}
			</div>

			{/* Controls */}
			<div className="flex justify-center gap-3">
				<Button
					variant="outline"
					onClick={handleReread}
					disabled={playState === "loading"}
				>
					<RotateCcw className="mr-2 h-4 w-4" />
					重读
				</Button>
				<Button
					onClick={handleNext}
					disabled={playState === "loading"}
				>
					<SkipForward className="mr-2 h-4 w-4" />
					{currentIdx + 1 >= words.length ? "完成" : "下一个"}
				</Button>
			</div>

			<div className="flex justify-center">
				<Button
					variant="destructive"
					size="sm"
					onClick={() => {
						stop();
						generationRef.current++;
						setShowEndDialog(true);
					}}
					disabled={playState === "loading"}
				>
					结束默写
				</Button>
			</div>

			<p className="text-center text-xs text-muted-foreground">
				按空格键快速跳到下一个词语
			</p>

			<Dialog
				open={showEndDialog}
				onOpenChange={(open) => {
					setShowEndDialog(open);
					if (!open) readCurrentWord(currentIdx);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>确认结束默写？</DialogTitle>
						<DialogDescription>
							已默写 {currentIdx + 1} / {words.length} 个词语，还有{" "}
							{words.length - currentIdx - 1} 个未默写。
							结束后将只对已默写的词语进行检查。
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setShowEndDialog(false);
								readCurrentWord(currentIdx);
							}}
						>
							继续默写
						</Button>
						<Button
							variant="destructive"
							onClick={handleEndEarly}
						>
							结束默写
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
