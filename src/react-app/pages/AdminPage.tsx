import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
	ChevronRight,
	Loader2,
	Plus,
	Search,
	Trash2,
	Pencil,
	Volume2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseSync } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useSpeak } from "@/hooks/useSpeak";
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

interface Grade {
	id: number;
	name: string;
	sort_order: number;
}
interface Unit {
	id: number;
	grade_id: number;
	name: string;
	sort_order: number;
}
interface Word {
	id: number;
	unit_id: number;
	word: string;
	phonetic: string | null;
	definition: string;
}

export function AdminPage() {
	const { isAdmin } = useAuth();
	const speak = useSpeak();

	const [grades, setGrades] = useState<Grade[]>([]);
	const [units, setUnits] = useState<Unit[]>([]);
	const [words, setWords] = useState<Word[]>([]);
	const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
	const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

	const [gradeDialog, setGradeDialog] = useState(false);
	const [unitDialog, setUnitDialog] = useState(false);
	const [wordDialog, setWordDialog] = useState(false);
	const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
	const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
	const [editingWord, setEditingWord] = useState<Word | null>(null);

	const [formName, setFormName] = useState("");
	const [wordForm, setWordForm] = useState({
		word: "",
		phonetic: "",
		definition: "",
	});
	const [lookingUp, setLookingUp] = useState(false);
	const [saving, setSaving] = useState(false);

	async function loadGrades() {
		const supabase = getSupabaseSync();
		const { data } = await supabase
			.from("grades")
			.select("id, name, sort_order, created_at")
			.order("sort_order");
		if (data) setGrades(data);
	}

	async function loadUnits(gradeId: number) {
		const supabase = getSupabaseSync();
		const { data } = await supabase
			.from("units")
			.select("id, grade_id, name, sort_order, created_at")
			.eq("grade_id", gradeId)
			.order("sort_order");
		if (data) setUnits(data);
	}

	async function loadWords(unitId: number) {
		const supabase = getSupabaseSync();
		const { data } = await supabase
			.from("words")
			.select("id, unit_id, word, phonetic, definition, created_at")
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

	// 学年操作
	async function handleSaveGrade() {
		setSaving(true);
		try {
			if (editingGrade) {
				await api.updateGrade(editingGrade.id, { name: formName });
			} else {
				await api.createGrade({
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

	async function handleDeleteGrade(g: Grade) {
		if (!confirm(`确定删除「${g.name}」及其所有单元和单词？`)) return;
		await api.deleteGrade(g.id);
		if (selectedGrade?.id === g.id) {
			setSelectedGrade(null);
			setUnits([]);
			setWords([]);
		}
		await loadGrades();
	}

	// 单元操作
	async function handleSaveUnit() {
		if (!selectedGrade) return;
		setSaving(true);
		try {
			if (editingUnit) {
				await api.updateUnit(editingUnit.id, { name: formName });
			} else {
				await api.createUnit({
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

	async function handleDeleteUnit(u: Unit) {
		if (!confirm(`确定删除「${u.name}」及其所有单词？`)) return;
		await api.deleteUnit(u.id);
		if (selectedUnit?.id === u.id) {
			setSelectedUnit(null);
			setWords([]);
		}
		if (selectedGrade) await loadUnits(selectedGrade.id);
	}

	// 单词操作
	async function handleLookup() {
		if (!wordForm.word.trim()) return;
		setLookingUp(true);
		try {
			const result = await api.lookupWord(wordForm.word.trim());
			setWordForm((f) => ({
				...f,
				phonetic: result.phonetic || f.phonetic,
				definition:
					result.chineseDefinition || f.definition,
			}));
		} catch {
			// 查询失败不阻塞
		} finally {
			setLookingUp(false);
		}
	}

	async function handleSaveWord() {
		if (!selectedUnit) return;
		setSaving(true);
		try {
			if (editingWord) {
				await api.updateWord(editingWord.id, wordForm);
			} else {
				await api.createWord({
					unit_id: selectedUnit.id,
					...wordForm,
				});
			}
			await loadWords(selectedUnit.id);
			setWordDialog(false);
		} finally {
			setSaving(false);
		}
	}

	async function handleDeleteWord(w: Word) {
		if (!confirm(`确定删除「${w.word}」？`)) return;
		await api.deleteWord(w.id);
		if (selectedUnit) await loadWords(selectedUnit.id);
	}

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold tracking-tight">词库管理</h1>

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

				{/* 右侧单词列表 */}
				<div className="rounded-lg border">
					<div className="flex items-center justify-between border-b px-4 py-3">
						<span className="font-medium">
							{selectedUnit
								? `${selectedGrade?.name} / ${selectedUnit.name}`
								: "选择一个单元查看单词"}
						</span>
						{selectedUnit && (
							<Button
								size="sm"
								onClick={() => {
									setEditingWord(null);
									setWordForm({
										word: "",
										phonetic: "",
										definition: "",
									});
									setWordDialog(true);
								}}
							>
								<Plus className="mr-1 h-4 w-4" />
								添加单词
							</Button>
						)}
					</div>
					<div className="divide-y">
						{words.map((w) => (
							<div
								key={w.id}
								className="group flex items-center justify-between px-4 py-3"
							>
								<div className="flex items-center gap-3">
									<button
										onClick={() => speak(w.word)}
										className="text-muted-foreground hover:text-primary"
										aria-label={`播放 ${w.word} 发音`}
									>
										<Volume2 className="h-4 w-4" />
									</button>
									<div>
										<span className="font-medium">
											{w.word}
										</span>
										{w.phonetic && (
											<span className="ml-2 text-sm text-muted-foreground">
												{w.phonetic}
											</span>
										)}
										<p className="text-sm text-muted-foreground">
											{w.definition}
										</p>
									</div>
								</div>
								<div className="hidden gap-1 group-hover:flex">
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8"
										onClick={() => {
											setEditingWord(w);
											setWordForm({
												word: w.word,
												phonetic: w.phonetic || "",
												definition: w.definition,
											});
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
								暂无单词，点击"添加单词"开始
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
								: "输入新学年的名称，如：一年级上册"}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="gradeName">学年名称</Label>
						<Input
							id="gradeName"
							value={formName}
							onChange={(e) => setFormName(e.target.value)}
							placeholder="如：一年级上册"
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
						<Label htmlFor="unitName">单元名称</Label>
						<Input
							id="unitName"
							value={formName}
							onChange={(e) => setFormName(e.target.value)}
							placeholder="如：Unit 1"
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

			{/* 单词 Dialog */}
			<Dialog open={wordDialog} onOpenChange={setWordDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editingWord ? "编辑单词" : "添加单词"}
						</DialogTitle>
						<DialogDescription>
							{editingWord
								? "修改单词信息"
								: "输入英文单词后可自动查询音标"}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<div className="space-y-2">
							<Label htmlFor="wordInput">英文单词</Label>
							<div className="flex gap-2">
								<Input
									id="wordInput"
									value={wordForm.word}
									onChange={(e) =>
										setWordForm((f) => ({
											...f,
											word: e.target.value,
										}))
									}
									placeholder="apple"
								/>
								<Button
									variant="outline"
									size="icon"
									onClick={handleLookup}
									disabled={lookingUp || !wordForm.word.trim()}
									aria-label="查询单词"
								>
									{lookingUp ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Search className="h-4 w-4" />
									)}
								</Button>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="phoneticInput">音标</Label>
							<Input
								id="phoneticInput"
								value={wordForm.phonetic}
								onChange={(e) =>
									setWordForm((f) => ({
										...f,
										phonetic: e.target.value,
									}))
								}
								placeholder="/ˈæp.əl/"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="definitionInput">中文释义</Label>
							<Input
								id="definitionInput"
								value={wordForm.definition}
								onChange={(e) =>
									setWordForm((f) => ({
										...f,
										definition: e.target.value,
									}))
								}
								placeholder="苹果"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							onClick={handleSaveWord}
							disabled={
								!wordForm.word.trim() ||
								!wordForm.definition.trim() ||
								saving
							}
						>
							{saving && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							保存
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
