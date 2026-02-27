import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, Ear, GraduationCap, Layers } from "lucide-react";
import { getSupabaseSync } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface Grade {
	id: number;
	name: string;
}
interface Unit {
	id: number;
	grade_id: number;
	name: string;
}

const quizModes = [
	{
		id: "cn_to_en",
		label: "看中文拼英文",
		desc: "显示中文释义，输入英文拼写",
		icon: BookOpen,
	},
	{
		id: "listen_write",
		label: "听写",
		desc: "听发音，输入英文拼写",
		icon: Ear,
	},
	{
		id: "flashcard",
		label: "闪卡",
		desc: "翻转卡片，标记认识/不认识",
		icon: Layers,
	},
] as const;

export function QuizSetupPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const [grades, setGrades] = useState<Grade[]>([]);
	const [units, setUnits] = useState<Unit[]>([]);
	const [selectedGrade, setSelectedGrade] = useState("");
	const [selectedUnit, setSelectedUnit] = useState(
		searchParams.get("unitId") || "",
	);
	const [selectedMode, setSelectedMode] = useState<string>("");

	useEffect(() => {
		async function loadGrades() {
			const supabase = getSupabaseSync();
			const { data } = await supabase
				.from("grades")
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
				.from("units")
				.select("id, grade_id, name")
				.eq("grade_id", Number(selectedGrade))
				.order("sort_order");
			if (data) setUnits(data);
		}
		loadUnits();
	}, [selectedGrade]);

	// 从 UnitWordsPage 跳转过来时预选 unitId
	useEffect(() => {
		const unitId = searchParams.get("unitId");
		if (unitId && grades.length > 0) {
			const supabase = getSupabaseSync();
			supabase
				.from("units")
				.select("grade_id")
				.eq("id", Number(unitId))
				.single()
				.then(({ data }) => {
					if (data) {
						setSelectedGrade(String(data.grade_id));
						setSelectedUnit(unitId);
					}
				});
		}
	}, [searchParams, grades]);

	function handleStart() {
		if (!selectedUnit || !selectedMode) return;
		navigate(
			`/quiz/${selectedMode}?unitId=${selectedUnit}`,
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">背诵</h1>
				<p className="text-muted-foreground">
					选择学年、单元和模式开始练习
				</p>
			</div>

			<div className="space-y-4">
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<label className="text-sm font-medium">学年</label>
						<Select
							value={selectedGrade}
							onValueChange={(v) => {
								setSelectedGrade(v);
								setSelectedUnit("");
							}}
						>
							<SelectTrigger>
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
					<div className="space-y-2">
						<label className="text-sm font-medium">单元</label>
						<Select
							value={selectedUnit}
							onValueChange={setSelectedUnit}
							disabled={!selectedGrade}
						>
							<SelectTrigger>
								<SelectValue placeholder="选择单元" />
							</SelectTrigger>
							<SelectContent>
								{units.map((u) => (
									<SelectItem
										key={u.id}
										value={String(u.id)}
									>
										{u.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium">背诵模式</label>
					<div className="grid gap-3 sm:grid-cols-3">
						{quizModes.map((mode) => (
							<Card
								key={mode.id}
								className={cn(
									"cursor-pointer transition-all",
									selectedMode === mode.id
										? "border-primary ring-2 ring-primary/20"
										: "hover:border-muted-foreground/30",
								)}
								onClick={() => setSelectedMode(mode.id)}
							>
								<CardContent className="flex flex-col items-center gap-2 p-4 text-center">
									<mode.icon
										className={cn(
											"h-8 w-8",
											selectedMode === mode.id
												? "text-primary"
												: "text-muted-foreground",
										)}
									/>
									<span className="font-medium text-sm">
										{mode.label}
									</span>
									<span className="text-xs text-muted-foreground">
										{mode.desc}
									</span>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</div>

			<Button
				size="lg"
				className="w-full sm:w-auto"
				disabled={!selectedUnit || !selectedMode}
				onClick={handleStart}
			>
				<GraduationCap className="mr-2 h-5 w-5" />
				开始背诵
			</Button>
		</div>
	);
}
