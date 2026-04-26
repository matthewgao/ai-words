import { Check, Pencil, Trash2, Repeat, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_CONFIG, type TodoWithTags } from "@/lib/todo-types";

interface TodoItemProps {
	todo: TodoWithTags;
	onComplete: (todo: TodoWithTags) => void;
	onEdit: (todo: TodoWithTags) => void;
	onDelete: (todo: TodoWithTags) => void;
}

function isOverdue(dueDate: string | null): boolean {
	if (!dueDate) return false;
	const today = new Date().toISOString().slice(0, 10);
	return dueDate < today;
}

export function TodoItem({ todo, onComplete, onEdit, onDelete }: TodoItemProps) {
	const priority = PRIORITY_CONFIG[todo.priority as 1 | 2 | 3] ?? PRIORITY_CONFIG[2];
	const overdue = !todo.completed && isOverdue(todo.due_date);
	const tags = todo.todo_tag_map?.map((m) => m.todo_tags).filter(Boolean) ?? [];

	return (
		<div
			className={cn(
				"group flex items-start gap-3 rounded-lg border p-3 transition-colors",
				todo.completed
					? "border-muted bg-muted/30 opacity-60"
					: overdue
						? "border-red-300 bg-red-50/50"
						: "border-border bg-background hover:bg-accent/30",
			)}
		>
			<button
				type="button"
				onClick={() => onComplete(todo)}
				className={cn(
					"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
					todo.completed
						? "border-primary bg-primary text-primary-foreground"
						: "border-muted-foreground/40 hover:border-primary",
				)}
				aria-label={todo.completed ? "标记为未完成" : "标记为完成"}
			>
				{todo.completed && <Check className="h-3 w-3" />}
			</button>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span
						className={cn(
							"text-sm font-medium",
							todo.completed && "line-through text-muted-foreground",
						)}
					>
						{todo.title}
					</span>
					<span
						className={cn(
							"inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold",
							priority.bg,
							priority.color,
						)}
					>
						{priority.label}
					</span>
					{todo.is_recurring && (
						<Repeat className="h-3.5 w-3.5 text-muted-foreground" />
					)}
					{overdue && (
						<AlertTriangle className="h-3.5 w-3.5 text-red-500" />
					)}
				</div>

				{todo.description && (
					<p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
						{todo.description}
					</p>
				)}

				<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
					{tags.map((tag) => (
						<Badge
							key={tag.id}
							variant="outline"
							className="text-[10px] px-1.5 py-0"
							style={{ borderColor: tag.color, color: tag.color }}
						>
							{tag.name}
						</Badge>
					))}
					{todo.due_date && (
						<span className={cn(
							"text-[11px]",
							overdue ? "text-red-500 font-medium" : "text-muted-foreground",
						)}>
							截止 {todo.due_date}
						</span>
					)}
					{todo.is_recurring && todo.recurrence_days && (
						<span className="text-[11px] text-muted-foreground">
							每{todo.recurrence_days}天
						</span>
					)}
				</div>
			</div>

			<div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					onClick={() => onEdit(todo)}
					aria-label="编辑"
				>
					<Pencil className="h-3.5 w-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-destructive hover:text-destructive"
					onClick={() => onDelete(todo)}
					aria-label="删除"
				>
					<Trash2 className="h-3.5 w-3.5" />
				</Button>
			</div>
		</div>
	);
}
