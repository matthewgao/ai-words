import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mic } from "lucide-react";
import { getSupabaseSync } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface CnGrade {
	id: number;
	name: string;
}
interface CnUnit {
	id: number;
	grade_id: number;
	name: string;
	word_count?: number;
}

export function ChineseDictationSetupPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const [grades, setGrades] = useState<CnGrade[]>([]);
	const [units, setUnits] = useState<CnUnit[]>([]);
	const [selectedGrade, setSelectedGrade] = useState("");
	const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());

	const source = searchParams.get("source");
	const importance = searchParams.get("importance");

	useEffect(() => {
		async function loadGrades() {
			const supabase = getSupabaseSync();
			const { data } = await supabase
				.from("cn_grades")
				.select("id, name")
				.order("sort_order");
			if (data) setGrades(data);
		}
		loadGrades();
	}, []);

	useEffect(() => {
		if (!selectedGrade) return;
		async function loadUnits() {
			const supabase = getSupabaseSync();
			const { data } = await supabase
				.from("cn_units")
				.select("id, grade_id, name, cn_words(count)")
				.eq("grade_id", Number(selectedGrade))
				.order("sort_order");
			if (data) {
				setUnits(
					data.map((u) => ({
						...u,
						word_count:
							(
								u.cn_words as unknown as Array<{
									count: number;
								}>
							)?.[0]?.count ?? 0,
					})),
				);
			}
		}
		loadUnits();
	}, [selectedGrade]);

	function toggleUnit(unitId: string) {
		setSelectedUnits((prev) => {
			const next = new Set(prev);
			if (next.has(unitId)) next.delete(unitId);
			else next.add(unitId);
			return next;
		});
	}

	function handleStart() {
		if (source === "wrong-words") {
			const params = new URLSearchParams({ source: "wrong-words" });
			if (importance) params.set("importance", importance);
			navigate(`/chinese/dictation/play?${params}`);
			return;
		}

		if (selectedUnits.size === 0) return;
		const unitIds = Array.from(selectedUnits).join(",");
		navigate(`/chinese/dictation/play?unitIds=${unitIds}`);
	}

	if (source === "wrong-words") {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						错题默写
					</h1>
					<p className="text-muted-foreground">
						{importance
							? "默写重点错误词语"
							: "默写所有错误词语"}
					</p>
				</div>
				<Button size="lg" onClick={handleStart}>
					<Mic className="mr-2 h-5 w-5" />
					开始默写
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">
					辅助默写
				</h1>
				<p className="text-muted-foreground">
					选择学年和单元，开始语文词语默写
				</p>
			</div>

			<div className="space-y-4">
				<div className="space-y-2">
					<label className="text-sm font-medium">学年</label>
					<Select
						value={selectedGrade}
						onValueChange={(v) => {
							setSelectedGrade(v);
							setSelectedUnits(new Set());
						}}
					>
						<SelectTrigger className="w-full sm:w-64">
							<SelectValue placeholder="选择学年" />
						</SelectTrigger>
						<SelectContent>
							{grades.map((g) => (
								<SelectItem
									key={g.id}
									value={String(g.id)}
								>
									{g.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{selectedGrade && (
					<div className="space-y-2">
						<label className="text-sm font-medium">
							选择单元（可多选）
						</label>
						<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
							{units.map((u) => (
								<label
									key={u.id}
									className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
										selectedUnits.has(String(u.id))
											? "border-primary bg-primary/5"
											: "hover:bg-muted/50"
									}`}
								>
									<input
										type="checkbox"
										checked={selectedUnits.has(
											String(u.id),
										)}
										onChange={() =>
											toggleUnit(String(u.id))
										}
										className="rounded"
									/>
									<div>
										<span className="text-sm font-medium">
											{u.name}
										</span>
										<span className="ml-2 text-xs text-muted-foreground">
											{u.word_count ?? 0} 个词
										</span>
									</div>
								</label>
							))}
							{units.length === 0 && (
								<p className="col-span-full py-4 text-center text-sm text-muted-foreground">
									该学年暂无单元
								</p>
							)}
						</div>
					</div>
				)}
			</div>

			<Button
				size="lg"
				className="w-full sm:w-auto"
				disabled={selectedUnits.size === 0}
				onClick={handleStart}
			>
				<Mic className="mr-2 h-5 w-5" />
				开始默写
				{selectedUnits.size > 0 && ` (${selectedUnits.size} 个单元)`}
			</Button>
		</div>
	);
}
