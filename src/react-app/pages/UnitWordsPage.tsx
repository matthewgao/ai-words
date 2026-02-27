import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, GraduationCap, Volume2 } from "lucide-react";
import { getSupabaseSync } from "@/lib/supabase";
import { useSpeak } from "@/hooks/useSpeak";
import { Button } from "@/components/ui/button";

interface Word {
	id: number;
	word: string;
	phonetic: string | null;
	definition: string;
}

export function UnitWordsPage() {
	const { gid, uid } = useParams<{ gid: string; uid: string }>();
	const navigate = useNavigate();
	const speak = useSpeak();

	const [words, setWords] = useState<Word[]>([]);
	const [gradeName, setGradeName] = useState("");
	const [unitName, setUnitName] = useState("");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function load() {
			const supabase = getSupabaseSync();

			const [gradeRes, unitRes, wordsRes] = await Promise.all([
				supabase.from("grades").select("name").eq("id", Number(gid!)).single(),
				supabase.from("units").select("name").eq("id", Number(uid!)).single(),
				supabase
					.from("words")
					.select("id, word, phonetic, definition")
					.eq("unit_id", Number(uid!))
					.order("id"),
			]);

			setGradeName(gradeRes.data?.name || "");
			setUnitName(unitRes.data?.name || "");
			setWords(wordsRes.data || []);
			setLoading(false);
		}
		load();
	}, [gid, uid]);

	if (loading) {
		return (
			<div className="flex justify-center py-12">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link to="/grades">
					<Button variant="ghost" size="icon" aria-label="返回词库">
						<ArrowLeft className="h-5 w-5" />
					</Button>
				</Link>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						{unitName}
					</h1>
					<p className="text-sm text-muted-foreground">
						{gradeName} · {words.length} 个单词
					</p>
				</div>
			</div>

			{words.length === 0 ? (
				<p className="py-8 text-center text-muted-foreground">
					该单元暂无单词
				</p>
			) : (
				<div className="divide-y rounded-lg border">
					{words.map((w, i) => (
						<div
							key={w.id}
							className="flex items-center gap-4 px-4 py-3"
						>
							<span className="w-6 text-right text-xs text-muted-foreground">
								{i + 1}
							</span>
							<button
								onClick={() => speak(w.word)}
								className="text-muted-foreground hover:text-primary transition-colors"
								aria-label={`播放 ${w.word} 发音`}
							>
								<Volume2 className="h-4 w-4" />
							</button>
							<div className="flex-1">
								<span className="font-medium">{w.word}</span>
								{w.phonetic && (
									<span className="ml-2 text-sm text-muted-foreground">
										{w.phonetic}
									</span>
								)}
							</div>
							<span className="text-sm text-muted-foreground">
								{w.definition}
							</span>
						</div>
					))}
				</div>
			)}

			{words.length > 0 && (
				<div className="flex justify-center">
					<Button
						size="lg"
						onClick={() =>
							navigate(`/quiz?unitId=${uid}&gradeName=${encodeURIComponent(gradeName)}&unitName=${encodeURIComponent(unitName)}`)
						}
					>
						<GraduationCap className="mr-2 h-5 w-5" />
						开始背诵
					</Button>
				</div>
			)}
		</div>
	);
}
