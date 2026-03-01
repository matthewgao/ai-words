import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
	ImagePlus,
	Loader2,
	CheckSquare,
	Square,
	Search,
	Upload,
	ClipboardPaste,
} from "lucide-react";
import { api } from "@/lib/api";
import { getCroppedImg } from "@/lib/crop-image";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";

interface ChineseOcrImportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	unitId: number;
	onImported: () => void;
}

type Step = "upload" | "select";

export function ChineseOcrImportDialog({
	open,
	onOpenChange,
	unitId,
	onImported,
}: ChineseOcrImportDialogProps) {
	const [step, setStep] = useState<Step>("upload");
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string>("");
	const [recognizing, setRecognizing] = useState(false);
	const [ocrWords, setOcrWords] = useState<string[]>([]);
	const [rawText, setRawText] = useState("");
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [importing, setImporting] = useState(false);
	const [error, setError] = useState("");
	const [crop, setCrop] = useState<Crop>();
	const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const imgRef = useRef<HTMLImageElement>(null);

	function reset() {
		setStep("upload");
		setImageFile(null);
		setImagePreview("");
		setRecognizing(false);
		setOcrWords([]);
		setRawText("");
		setSelected(new Set());
		setImporting(false);
		setError("");
		setCrop(undefined);
		setCompletedCrop(undefined);
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
		setCrop(undefined);
		setCompletedCrop(undefined);
	}

	function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) handleFileSelect(file);
	}

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			const file = e.dataTransfer.files[0];
			if (file) handleFileSelect(file);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[imagePreview],
	);

	useEffect(() => {
		if (!open || step !== "upload") return;
		function handlePaste(e: ClipboardEvent) {
			const items = e.clipboardData?.items;
			if (!items) return;
			for (const item of items) {
				if (item.type.startsWith("image/")) {
					e.preventDefault();
					const file = item.getAsFile();
					if (file) handleFileSelect(file);
					return;
				}
			}
		}
		document.addEventListener("paste", handlePaste);
		return () => document.removeEventListener("paste", handlePaste);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, step, imagePreview]);

	async function handleRecognize() {
		if (!imageFile) return;
		setRecognizing(true);
		setError("");
		try {
			let fileToSend = imageFile;
			if (completedCrop && imgRef.current && completedCrop.width > 0 && completedCrop.height > 0) {
				const blob = await getCroppedImg(
					imagePreview,
					completedCrop,
					imgRef.current.width,
					imgRef.current.height,
				);
				fileToSend = new File([blob], imageFile.name, {
					type: "image/jpeg",
				});
			}
			const result = await api.cnOcrRecognize(fileToSend);
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

	async function handleImport() {
		if (selected.size === 0) return;
		setImporting(true);
		setError("");
		try {
			const words = Array.from(selected).map((word) => ({
				unit_id: unitId,
				word,
			}));
			await api.createCnWordsBatch(words);
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
		select: "选择词语",
	};
	const stepDesc: Record<Step, string> = {
		upload: "上传包含中文词语的图片，可裁剪选择识别区域",
		select: `识别到 ${ocrWords.length} 个词语，请勾选需要导入的词语`,
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
									onClick={() =>
										fileInputRef.current?.click()
									}
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
									<div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
										<ClipboardPaste className="h-3.5 w-3.5" />
										<span>也可直接 Ctrl+V / Cmd+V 粘贴截图</span>
									</div>
								</div>
							) : (
								<div className="space-y-3">
									<div className="rounded-lg border overflow-hidden bg-muted/30 flex justify-center">
										<ReactCrop
											crop={crop}
											onChange={(c) => setCrop(c)}
											onComplete={(c) => setCompletedCrop(c)}
										>
											<img
												ref={imgRef}
												src={imagePreview}
												alt="待识别图片"
												className="max-h-64 object-contain"
											/>
										</ReactCrop>
									</div>
									<p className="text-xs text-muted-foreground">
										可拖拽选择裁剪区域，不选则识别整张图片
									</p>
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											fileInputRef.current?.click()
										}
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
							onClick={handleImport}
							disabled={selected.size === 0 || importing}
						>
							{importing ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									导入中...
								</>
							) : (
								<>导入 ({selected.size} 个词语)</>
							)}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
