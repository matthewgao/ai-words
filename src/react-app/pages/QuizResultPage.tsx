import { useLocation, useNavigate } from "react-router-dom";
import { Check, Home, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSpeak } from "@/hooks/useSpeak";
import { Volume2 } from "lucide-react";

interface QuizResult {
	wordId: number;
	word: string;
	definition: string;
	isCorrect: boolean;
	userAnswer?: string;
}

interface LocationState {
	results: QuizResult[];
	mode: string;
	total: number;
}

const modeLabels: Record<string, string> = {
	cn_to_en: "看中文拼英文",
	listen_write: "听写",
	flashcard: "闪卡",
};

export function QuizResultPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const speak = useSpeak();

	const state = location.state as LocationState | undefined;

	if (!state) {
		return (
			<div className="flex flex-col items-center py-12">
				<p className="text-muted-foreground">没有测试数据</p>
				<Button variant="link" onClick={() => navigate("/quiz")}>
					去背诵
				</Button>
			</div>
		);
	}

	const { results, mode } = state;
	const correctCount = results.filter((r) => r.isCorrect).length;
	const wrongResults = results.filter((r) => !r.isCorrect);
	const accuracy =
		results.length > 0
			? Math.round((correctCount / results.length) * 100)
			: 0;

	return (
		<div className="mx-auto max-w-lg space-y-6">
			<div className="text-center space-y-2">
				<h1 className="text-2xl font-bold">背诵完成</h1>
				<p className="text-sm text-muted-foreground">
					{modeLabels[mode] || mode}
				</p>
			</div>

			{/* 统计卡片 */}
			<div className="grid grid-cols-3 gap-3">
				<Card>
					<CardContent className="p-4 text-center">
						<p className="text-2xl font-bold">{results.length}</p>
						<p className="text-xs text-muted-foreground">总题数</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<p className="text-2xl font-bold text-green-600">
							{correctCount}
						</p>
						<p className="text-xs text-muted-foreground">正确</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<p className="text-2xl font-bold text-primary">
							{accuracy}%
						</p>
						<p className="text-xs text-muted-foreground">正确率</p>
					</CardContent>
				</Card>
			</div>

			{/* 错误单词列表 */}
			{wrongResults.length > 0 && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base text-red-600">
							答错的单词（{wrongResults.length}）
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="divide-y">
							{wrongResults.map((r) => (
								<div
									key={r.wordId}
									className="flex items-center justify-between py-2"
								>
									<div className="flex items-center gap-2">
										<X className="h-4 w-4 text-red-400" />
										<div>
											<span className="font-medium">
												{r.word}
											</span>
											<span className="ml-2 text-sm text-muted-foreground">
												{r.definition}
											</span>
										</div>
									</div>
									<button
										onClick={() => speak(r.word)}
										className="text-muted-foreground hover:text-primary"
										aria-label={`播放 ${r.word}`}
									>
										<Volume2 className="h-4 w-4" />
									</button>
								</div>
							))}
						</div>
						<p className="mt-3 text-xs text-muted-foreground">
							<Check className="inline h-3 w-3" /> 错误单词已自动加入错题本
						</p>
					</CardContent>
				</Card>
			)}

			{wrongResults.length === 0 && (
				<div className="rounded-lg bg-green-50 p-6 text-center">
					<Check className="mx-auto h-10 w-10 text-green-600" />
					<p className="mt-2 font-medium text-green-800">
						全部正确，太棒了！
					</p>
				</div>
			)}

			{/* 操作按钮 */}
			<div className="flex gap-3">
				<Button
					variant="outline"
					className="flex-1"
					onClick={() => navigate("/quiz")}
				>
					<RotateCcw className="mr-1 h-4 w-4" />
					继续背诵
				</Button>
				<Button className="flex-1" onClick={() => navigate("/")}>
					<Home className="mr-1 h-4 w-4" />
					回首页
				</Button>
			</div>
		</div>
	);
}
