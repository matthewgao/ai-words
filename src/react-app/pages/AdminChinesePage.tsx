import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
	ChevronRight,
	ImagePlus,
	Loader2,
	Plus,
	Trash2,
	Pencil,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseSync } from "@/lib/supabase";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { ChineseOcrImportDialog } from "@/components/ChineseOcrImportDialog";

interface CnGrade {
	id: number;
	name: string;
	sort_order: number;
}
interface CnUnit {
	id: number;
	grade_id: number;
	name: string;
	sort_order: number;
}
interface CnWord {
	id: number;
	unit_id: number;
	word: string;
}

export function AdminChinesePage() {
	const { isAdmin } = useAuth();

	const [grades, setGrades] = useState<CnGrade[]>([]);
	const [units, setUnits] = useState<CnUnit[]>([]);
	const [words, setWords] = useState<CnWord[]>([]);
	const [selectedGrade, setSelectedGrade] = useState<CnGrade | null>(null);
	const [selectedUnit, setSelectedUnit] = useState<CnUnit | null>(null);

	const [gradeDialog, setGradeDialog] = useState(false);
	const [unitDialog, setUnitDialog] = useState(false);
	const [wordDialog, setWordDialog] = useState(false);
	const [editingGrade, setEditingGrade] = useState<CnGrade | null>(null);
	const [editingUnit, setEditingUnit] = useState<CnUnit | null>(null);
	const [editingWord, setEditingWord] = useState<CnWord | null>(null);

	const [formName, setFormName] = useState("");
	const [wordFormText, setWordFormText] = useState("");
	const [saving, setSaving] = useState(false);
	const [ocrDialog, setOcrDialog] = useState(false);

	async function loadGrades() {
		const supabase = getSupabaseSync();
		const { data } = await supabase
			.from("cn_grades")
			.select("id, name, sort_order, created_at")
			.order("sort_order");
		if (data) setGrades(data);
	}

	async function loadUnits(gradeId: number) {
		const supabase = getSupabaseSync();
		const { data } = await supabase
			.from("cn_units")
			.select("id, grade_id, name, sort_order, created_at")
			.eq("grade_id", gradeId)
			.order("sort_order");
		if (data) setUnits(data);
	}

	async function loadWords(unitId: number) {
		const supabase = getSupabaseSync();
		const { data } = await supabase
			.from("cn_words")
			.select("id, unit_id, word, created_at")
			.eq("unit_id", unitId)
			.order("id");
		if (data) setWords(data);
	}

	useEffect(() => {
		void loadGrades();
	}, []);

	useEffect(() => {
		if (selectedGrade) {
			void loadUnits(selectedGrade.id);
			setSelectedUnit(null);
			setWords([]);
		}
	}, [selectedGrade]);

	useEffect(() => {
		if (selectedUnit) void loadWords(selectedUnit.id);
	}, [selectedUnit]);

	if (!isAdmin) return <Navigate to="/" replace />;

	async function handleSaveGrade() {
		setSaving(true);
		try {
			if (editingGrade) {
				await api.updateCnGrade(editingGrade.id, { name: formName });
			} else {
				await api.createCnGrade({
					name: formName,
					sort_order: grades.length,
				});
			}
			await loadGrades();
			setGradeDialog(false);
		} finally {
			setSaving(false);
		}
	}

	async function handleDeleteGrade(g: CnGrade) {
		if (!confirm(`确定删除「${g.name}」及其所有单元和词汇？`)) return;
		await api.deleteCnGrade(g.id);
		if (selectedGrade?.id === g.id) {
			setSelectedGrade(null);
			setUnits([]);
			setWords([]);
		}
		await loadGrades();
	}

	async function handleSaveUnit() {
		if (!selectedGrade) return;
		setSaving(true);
		try {
			if (editingUnit) {
				await api.updateCnUnit(editingUnit.id, { name: formName });
			} else {
				await api.createCnUnit({
					grade_id: selectedGrade.id,
					name: formName,
					sort_order: units.length,
				});
			}
			await loadUnits(selectedGrade.id);
			setUnitDialog(false);
		} finally {
			setSaving(false);
		}
	}

	async function handleDeleteUnit(u: CnUnit) {
		if (!confirm(`确定删除「${u.name}」及其所有词汇？`)) return;
		await api.deleteCnUnit(u.id);
		if (selectedUnit?.id === u.id) {
			setSelectedUnit(null);
			setWords([]);
		}
		if (selectedGrade) await loadUnits(selectedGrade.id);
	}

	async function handleSaveWord() {
		if (!selectedUnit) return;
		setSaving(true);
		try {
			if (editingWord) {
				await api.updateCnWord(editingWord.id, {
					word: wordFormText,
				});
			} else {
				await api.createCnWord({
					unit_id: selectedUnit.id,
					word: wordFormText,
				});
			}
			await loadWords(selectedUnit.id);
			setWordDialog(false);
		} finally {
			setSaving(false);
		}
	}

	async function handleDeleteWord(w: CnWord) {
		if (!confirm(`确定删除「${w.word}」？`)) return;
		await api.deleteCnWord(w.id);
		if (selectedUnit) await loadWords(selectedUnit.id);
	}

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold tracking-tight">
				语文词库管理
			</h1>

			<div className="grid gap-6 lg:grid-cols-[280px_1fr]">
				{/* 左侧导航 */}
				<div className="space-y-4">
					{/* 学年列表 */}
					<div className="rounded-lg border">
						<div className="flex items-center justify-between border-b px-3 py-2">
							<span className="text-sm font-medium">学年</span>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7"
								onClick={() => {
									setEditingGrade(null);
									setFormName("");
									setGradeDialog(true);
								}}
								aria-label="添加学年"
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
						<div className="max-h-48 overflow-y-auto p-1">
							{grades.map((g) => (
								<div
									key={g.id}
									className={cn(
										"group flex items-center justify-between rounded-md px-2 py-1.5 text-sm cursor-pointer",
										selectedGrade?.id === g.id
											? "bg-accent text-accent-foreground"
											: "hover:bg-muted",
									)}
									onClick={() => setSelectedGrade(g)}
								>
									<span className="flex items-center gap-1">
										<ChevronRight className="h-3 w-3" />
										{g.name}
									</span>
									<div className="hidden gap-1 group-hover:flex">
										<button
											className="rounded p-0.5 hover:bg-background"
											onClick={(e) => {
												e.stopPropagation();
												setEditingGrade(g);
												setFormName(g.name);
												setGradeDialog(true);
											}}
											aria-label={`编辑${g.name}`}
										>
											<Pencil className="h-3 w-3" />
										</button>
										<button
											className="rounded p-0.5 hover:bg-background text-destructive"
											onClick={(e) => {
												e.stopPropagation();
												handleDeleteGrade(g);
											}}
											aria-label={`删除${g.name}`}
										>
											<Trash2 className="h-3 w-3" />
										</button>
									</div>
								</div>
							))}
							{grades.length === 0 && (
								<p className="px-2 py-4 text-center text-xs text-muted-foreground">
									暂无学年，点击 + 添加
								</p>
							)}
						</div>
					</div>

					{/* 单元列表 */}
					{selectedGrade && (
						<div className="rounded-lg border">
							<div className="flex items-center justify-between border-b px-3 py-2">
								<span className="text-sm font-medium">
									{selectedGrade.name} - 单元
								</span>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7"
									onClick={() => {
										setEditingUnit(null);
										setFormName("");
										setUnitDialog(true);
									}}
									aria-label="添加单元"
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
							<div className="max-h-60 overflow-y-auto p-1">
								{units.map((u) => (
									<div
										key={u.id}
										className={cn(
											"group flex items-center justify-between rounded-md px-2 py-1.5 text-sm cursor-pointer",
											selectedUnit?.id === u.id
												? "bg-accent text-accent-foreground"
												: "hover:bg-muted",
										)}
										onClick={() => setSelectedUnit(u)}
									>
										<span>{u.name}</span>
										<div className="hidden gap-1 group-hover:flex">
											<button
												className="rounded p-0.5 hover:bg-background"
												onClick={(e) => {
													e.stopPropagation();
													setEditingUnit(u);
													setFormName(u.name);
													setUnitDialog(true);
												}}
												aria-label={`编辑${u.name}`}
											>
												<Pencil className="h-3 w-3" />
											</button>
											<button
												className="rounded p-0.5 hover:bg-background text-destructive"
												onClick={(e) => {
													e.stopPropagation();
													handleDeleteUnit(u);
												}}
												aria-label={`删除${u.name}`}
											>
												<Trash2 className="h-3 w-3" />
											</button>
										</div>
									</div>
								))}
								{units.length === 0 && (
									<p className="px-2 py-4 text-center text-xs text-muted-foreground">
										暂无单元
									</p>
								)}
							</div>
						</div>
					)}
				</div>

				{/* 右侧词汇列表 */}
				<div className="rounded-lg border">
					<div className="flex items-center justify-between border-b px-4 py-3">
						<span className="font-medium">
							{selectedUnit
								? `${selectedGrade?.name} / ${selectedUnit.name}`
								: "选择一个单元查看词汇"}
						</span>
						{selectedUnit && (
							<div className="flex gap-2">
								<Button
									size="sm"
									variant="outline"
									onClick={() => setOcrDialog(true)}
								>
									<ImagePlus className="mr-1 h-4 w-4" />
									图片导入
								</Button>
								<Button
									size="sm"
									onClick={() => {
										setEditingWord(null);
										setWordFormText("");
										setWordDialog(true);
									}}
								>
									<Plus className="mr-1 h-4 w-4" />
									添加词语
								</Button>
							</div>
						)}
					</div>
					<div className="divide-y">
						{words.map((w) => (
							<div
								key={w.id}
								className="group flex items-center justify-between px-4 py-3"
							>
								<span className="font-medium text-lg">
									{w.word}
								</span>
								<div className="hidden gap-1 group-hover:flex">
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8"
										onClick={() => {
											setEditingWord(w);
											setWordFormText(w.word);
											setWordDialog(true);
										}}
										aria-label={`编辑 ${w.word}`}
									>
										<Pencil className="h-3.5 w-3.5" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-destructive"
										onClick={() => handleDeleteWord(w)}
										aria-label={`删除 ${w.word}`}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						))}
						{selectedUnit && words.length === 0 && (
							<p className="py-8 text-center text-sm text-muted-foreground">
								暂无词汇，点击"添加词语"开始
							</p>
						)}
						{!selectedUnit && (
							<p className="py-8 text-center text-sm text-muted-foreground">
								请在左侧选择学年和单元
							</p>
						)}
					</div>
				</div>
			</div>

			{/* 学年 Dialog */}
			<Dialog open={gradeDialog} onOpenChange={setGradeDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editingGrade ? "编辑学年" : "添加学年"}
						</DialogTitle>
						<DialogDescription>
							{editingGrade
								? "修改学年名称"
								: "输入新学年的名称，如：三年级上册"}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="cnGradeName">学年名称</Label>
						<Input
							id="cnGradeName"
							value={formName}
							onChange={(e) => setFormName(e.target.value)}
							placeholder="如：三年级上册"
						/>
					</div>
					<DialogFooter>
						<Button
							onClick={handleSaveGrade}
							disabled={!formName.trim() || saving}
						>
							{saving && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							保存
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 单元 Dialog */}
			<Dialog open={unitDialog} onOpenChange={setUnitDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editingUnit ? "编辑单元" : "添加单元"}
						</DialogTitle>
						<DialogDescription>
							{editingUnit
								? "修改单元名称"
								: `为「${selectedGrade?.name}」添加单元`}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="cnUnitName">单元名称</Label>
						<Input
							id="cnUnitName"
							value={formName}
							onChange={(e) => setFormName(e.target.value)}
							placeholder="如：第一单元"
						/>
					</div>
					<DialogFooter>
						<Button
							onClick={handleSaveUnit}
							disabled={!formName.trim() || saving}
						>
							{saving && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							保存
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 词语 Dialog */}
			<Dialog open={wordDialog} onOpenChange={setWordDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editingWord ? "编辑词语" : "添加词语"}
						</DialogTitle>
						<DialogDescription>
							{editingWord
								? "修改词语内容"
								: "输入需要默写的中文词语"}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="cnWordInput">词语</Label>
						<Input
							id="cnWordInput"
							value={wordFormText}
							onChange={(e) => setWordFormText(e.target.value)}
							placeholder="如：春暖花开"
						/>
					</div>
					<DialogFooter>
						<Button
							onClick={handleSaveWord}
							disabled={!wordFormText.trim() || saving}
						>
							{saving && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							保存
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* OCR 图片导入 Dialog */}
			{selectedUnit && (
				<ChineseOcrImportDialog
					open={ocrDialog}
					onOpenChange={setOcrDialog}
					unitId={selectedUnit.id}
					onImported={() => {
						if (selectedUnit) loadWords(selectedUnit.id);
					}}
				/>
			)}
		</div>
	);
}
