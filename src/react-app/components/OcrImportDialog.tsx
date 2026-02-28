import { useState, useRef, useCallback } from "react";
import { ImagePlus, Loader2, CheckSquare, Square, Search, Upload } from "lucide-react";
import { api } from "@/lib/api";
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

interface WordDetail {
	phonetic: string;
	definition: string;
}

interface OcrImportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	unitId: number;
	onImported: () => void;
}

type Step = "upload" | "select" | "edit";

export function OcrImportDialog({
	open,
	onOpenChange,
	unitId,
	onImported,
}: OcrImportDialogProps) {
	const [step, setStep] = useState<Step>("upload");
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string>("");
	const [recognizing, setRecognizing] = useState(false);
	const [ocrWords, setOcrWords] = useState<string[]>([]);
	const [rawText, setRawText] = useState("");
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [wordDetails, setWordDetails] = useState<Map<string, WordDetail>>(
		new Map(),
	);
	const [lookingUp, setLookingUp] = useState(false);
	const [importing, setImporting] = useState(false);
	const [error, setError] = useState("");
	const fileInputRef = useRef<HTMLInputElement>(null);

	function reset() {
		setStep("upload");
		setImageFile(null);
		setImagePreview("");
		setRecognizing(false);
		setOcrWords([]);
		setRawText("");
		setSelected(new Set());
		setWordDetails(new Map());
		setLookingUp(false);
		setImporting(false);
		setError("");
	}

	function handleOpenChange(value: boolean) {
		if (!value) reset();
		onOpenChange(value);
	}

	function handleFileSelect(file: File) {
		if (!file.type.startsWith("image/")) {
			setError("请选择图片文件");
			return;
		}
		setError("");
		setImageFile(file);
		if (imagePreview) URL.revokeObjectURL(imagePreview);
		setImagePreview(URL.createObjectURL(file));
	}

	function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) handleFileSelect(file);
	}

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if (file) handleFileSelect(file);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [imagePreview]);

	async function handleRecognize() {
		if (!imageFile) return;
		setRecognizing(true);
		setError("");
		try {
			const result = await api.ocrRecognize(imageFile);
			setOcrWords(result.words);
			setRawText(result.rawText);
			setSelected(new Set(result.words));
			setStep("select");
		} catch (err) {
			setError(err instanceof Error ? err.message : "OCR 识别失败");
		} finally {
			setRecognizing(false);
		}
	}

	function toggleWord(word: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(word)) next.delete(word);
			else next.add(word);
			return next;
		});
	}

	function toggleAll() {
		if (selected.size === ocrWords.length) {
			setSelected(new Set());
		} else {
			setSelected(new Set(ocrWords));
		}
	}

	async function handleLookupAll() {
		if (selected.size === 0) return;
		setLookingUp(true);
		setError("");

		const details = new Map<string, WordDetail>();
		const words = Array.from(selected);

		const results = await Promise.allSettled(
			words.map((w) => api.lookupWord(w)),
		);
		for (let i = 0; i < words.length; i++) {
			const r = results[i];
			if (r.status === "fulfilled") {
				details.set(words[i], {
					phonetic: r.value.phonetic || "",
					definition: r.value.chineseDefinition || "",
				});
			} else {
				details.set(words[i], { phonetic: "", definition: "" });
			}
		}

		setWordDetails(details);
		setLookingUp(false);
		setStep("edit");
	}

	function updateDetail(word: string, field: keyof WordDetail, value: string) {
		setWordDetails((prev) => {
			const next = new Map(prev);
			const current = next.get(word) || { phonetic: "", definition: "" };
			next.set(word, { ...current, [field]: value });
			return next;
		});
	}

	async function handleImport() {
		setImporting(true);
		setError("");
		try {
			const words = Array.from(wordDetails.entries()).map(
				([word, detail]) => ({
					unit_id: unitId,
					word,
					phonetic: detail.phonetic || undefined,
					definition: detail.definition || word,
				}),
			);
			await api.createWordsBatch(words);
			onImported();
			handleOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "导入失败");
		} finally {
			setImporting(false);
		}
	}

	const stepTitle: Record<Step, string> = {
		upload: "上传图片",
		select: "选择单词",
		edit: "确认导入",
	};
	const stepDesc: Record<Step, string> = {
		upload: "上传包含英文单词的图片，系统将自动识别其中的单词",
		select: `识别到 ${ocrWords.length} 个单词，请勾选需要导入的单词`,
		edit: "查询到音标和释义，可编辑后确认导入",
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ImagePlus className="h-5 w-5" />
						图片导入 - {stepTitle[step]}
					</DialogTitle>
					<DialogDescription>{stepDesc[step]}</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{error}
					</div>
				)}

				<div className="flex-1 overflow-y-auto min-h-0">
					{step === "upload" && (
						<div className="space-y-4">
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								className="hidden"
								onChange={handleInputChange}
							/>
							{!imagePreview ? (
								<div
									className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 cursor-pointer transition-colors hover:border-primary hover:bg-muted/50"
									onClick={() => fileInputRef.current?.click()}
									onDrop={handleDrop}
									onDragOver={(e) => e.preventDefault()}
								>
									<Upload className="h-10 w-10 text-muted-foreground" />
									<div className="text-center">
										<p className="font-medium">
											点击或拖拽上传图片
										</p>
										<p className="text-sm text-muted-foreground">
											支持 JPG、PNG 等常见格式
										</p>
									</div>
								</div>
							) : (
								<div className="space-y-3">
									<div className="relative rounded-lg border overflow-hidden">
										<img
											src={imagePreview}
											alt="预览"
											className="max-h-64 w-full object-contain bg-muted/30"
										/>
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => fileInputRef.current?.click()}
									>
										重新选择
									</Button>
								</div>
							)}
						</div>
					)}

					{step === "select" && (
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<Button
									variant="outline"
									size="sm"
									onClick={toggleAll}
								>
									{selected.size === ocrWords.length ? (
										<>
											<Square className="mr-1 h-4 w-4" />
											取消全选
										</>
									) : (
										<>
											<CheckSquare className="mr-1 h-4 w-4" />
											全选
										</>
									)}
								</Button>
								<span className="text-sm text-muted-foreground">
									已选 {selected.size} / {ocrWords.length}
								</span>
							</div>
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto rounded-lg border p-3">
								{ocrWords.map((w) => (
									<label
										key={w}
										className="flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
									>
										<input
											type="checkbox"
											checked={selected.has(w)}
											onChange={() => toggleWord(w)}
											className="rounded"
										/>
										<span className="text-sm truncate">
											{w}
										</span>
									</label>
								))}
							</div>
							{rawText && (
								<details className="text-sm">
									<summary className="cursor-pointer text-muted-foreground hover:text-foreground">
										查看原始识别文本
									</summary>
									<pre className="mt-2 rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-all">
										{rawText}
									</pre>
								</details>
							)}
						</div>
					)}

					{step === "edit" && (
						<div className="space-y-3 max-h-80 overflow-y-auto">
							{Array.from(wordDetails.entries()).map(
								([word, detail]) => (
									<div
										key={word}
										className="grid grid-cols-[1fr_1fr_1.5fr] gap-2 items-center rounded-lg border p-3"
									>
										<div>
											<Label className="text-xs text-muted-foreground">
												单词
											</Label>
											<p className="font-medium">
												{word}
											</p>
										</div>
										<div>
											<Label className="text-xs text-muted-foreground">
												音标
											</Label>
											<Input
												value={detail.phonetic}
												onChange={(e) =>
													updateDetail(
														word,
														"phonetic",
														e.target.value,
													)
												}
												placeholder="/.../"
												className="h-8 text-sm"
											/>
										</div>
										<div>
											<Label className="text-xs text-muted-foreground">
												释义
											</Label>
											<Input
												value={detail.definition}
												onChange={(e) =>
													updateDetail(
														word,
														"definition",
														e.target.value,
													)
												}
												placeholder="中文释义"
												className="h-8 text-sm"
											/>
										</div>
									</div>
								),
							)}
						</div>
					)}
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					{step === "select" && (
						<Button
							variant="outline"
							onClick={() => setStep("upload")}
						>
							上一步
						</Button>
					)}
					{step === "edit" && (
						<Button
							variant="outline"
							onClick={() => setStep("select")}
						>
							上一步
						</Button>
					)}

					{step === "upload" && (
						<Button
							onClick={handleRecognize}
							disabled={!imageFile || recognizing}
						>
							{recognizing ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									识别中...
								</>
							) : (
								<>
									<Search className="mr-1 h-4 w-4" />
									开始识别
								</>
							)}
						</Button>
					)}
					{step === "select" && (
						<Button
							onClick={handleLookupAll}
							disabled={selected.size === 0 || lookingUp}
						>
							{lookingUp ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									查询释义中...
								</>
							) : (
								<>
									查询释义 ({selected.size})
								</>
							)}
						</Button>
					)}
					{step === "edit" && (
						<Button
							onClick={handleImport}
							disabled={wordDetails.size === 0 || importing}
						>
							{importing ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									导入中...
								</>
							) : (
								<>导入 ({wordDetails.size} 个单词)</>
							)}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
