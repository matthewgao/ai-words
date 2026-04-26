import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TodoWithTags, TodoTagRow } from "@/lib/todo-types";

interface TodoFormData {
	title: string;
	description: string;
	start_date: string;
	due_date: string;
	priority: number;
	is_recurring: boolean;
	recurrence_days: number;
	tag_ids: number[];
}

interface TodoFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	todo?: TodoWithTags | null;
	tags: TodoTagRow[];
	onSave: (data: TodoFormData) => Promise<void>;
}

function getInitialData(todo?: TodoWithTags | null): TodoFormData {
	if (todo) {
		return {
			title: todo.title,
			description: todo.description || "",
			start_date: todo.start_date || "",
			due_date: todo.due_date || "",
			priority: todo.priority,
			is_recurring: todo.is_recurring,
			recurrence_days: todo.recurrence_days || 1,
			tag_ids: todo.todo_tag_map?.map((m) => m.tag_id) ?? [],
		};
	}
	return {
		title: "",
		description: "",
		start_date: "",
		due_date: new Date().toISOString().slice(0, 10),
		priority: 2,
		is_recurring: false,
		recurrence_days: 1,
		tag_ids: [],
	};
}

export function TodoFormDialog({
	open,
	onOpenChange,
	todo,
	tags,
	onSave,
}: TodoFormDialogProps) {
	const [form, setForm] = useState<TodoFormData>(() => getInitialData(todo));
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (open) {
			setForm(getInitialData(todo));
		}
	}, [open, todo]);

	const isEdit = !!todo;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.title.trim()) return;
		setSaving(true);
		try {
			await onSave(form);
			onOpenChange(false);
		} finally {
			setSaving(false);
		}
	};

	const toggleTagId = (tagId: number) => {
		setForm((prev) => ({
			...prev,
			tag_ids: prev.tag_ids.includes(tagId)
				? prev.tag_ids.filter((id) => id !== tagId)
				: [...prev.tag_ids, tagId],
		}));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEdit ? "编辑 TODO" : "新增 TODO"}</DialogTitle>
					<DialogDescription>
						{isEdit ? "修改待办事项详情" : "创建一个新的待办事项"}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="todo-title">标题 *</Label>
						<Input
							id="todo-title"
							placeholder="输入标题"
							value={form.title}
							onChange={(e) =>
								setForm((prev) => ({ ...prev, title: e.target.value }))
							}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="todo-desc">详情</Label>
						<Textarea
							id="todo-desc"
							placeholder="输入详细描述（可选）"
							value={form.description}
							onChange={(e) =>
								setForm((prev) => ({ ...prev, description: e.target.value }))
							}
							className="min-h-[60px]"
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label htmlFor="todo-start">开始日期</Label>
							<Input
								id="todo-start"
								type="date"
								value={form.start_date}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, start_date: e.target.value }))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="todo-due">截止日期</Label>
							<Input
								id="todo-due"
								type="date"
								value={form.due_date}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, due_date: e.target.value }))
								}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label>优先级</Label>
						<Select
							value={String(form.priority)}
							onValueChange={(v) =>
								setForm((prev) => ({ ...prev, priority: Number(v) }))
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="1">高优先级</SelectItem>
								<SelectItem value="2">中优先级</SelectItem>
								<SelectItem value="3">低优先级</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{tags.length > 0 && (
						<div className="space-y-2">
							<Label>标签</Label>
							<div className="flex flex-wrap gap-1.5">
								{tags.map((tag) => (
									<button
										key={tag.id}
										type="button"
										onClick={() => toggleTagId(tag.id)}
										className={cn(
											"rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
											form.tag_ids.includes(tag.id)
												? "text-white"
												: "bg-background",
										)}
										style={{
											borderColor: tag.color,
											backgroundColor: form.tag_ids.includes(tag.id)
												? tag.color
												: undefined,
											color: form.tag_ids.includes(tag.id)
												? "#fff"
												: tag.color,
										}}
									>
										{tag.name}
									</button>
								))}
							</div>
						</div>
					)}

					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="todo-recurring"
								checked={form.is_recurring}
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										is_recurring: e.target.checked,
									}))
								}
								className="h-4 w-4 rounded border-input"
							/>
							<Label htmlFor="todo-recurring" className="cursor-pointer">
								周期重复
							</Label>
						</div>
						{form.is_recurring && (
							<div className="flex items-center gap-2 ml-6">
								<span className="text-sm text-muted-foreground">每</span>
								<Input
									type="number"
									min={1}
									value={form.recurrence_days}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											recurrence_days: Math.max(1, Number(e.target.value)),
										}))
									}
									className="h-8 w-20 text-sm"
								/>
								<span className="text-sm text-muted-foreground">天</span>
							</div>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							取消
						</Button>
						<Button type="submit" disabled={saving || !form.title.trim()}>
							{saving ? "保存中…" : isEdit ? "保存" : "创建"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
