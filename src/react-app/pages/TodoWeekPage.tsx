import { useMemo, useState } from "react";
import { Plus, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TodoItem } from "@/components/TodoItem";
import { TodoFormDialog } from "@/components/TodoFormDialog";
import { TodoTagFilter } from "@/components/TodoTagFilter";
import { useTodos } from "@/hooks/useTodos";
import type { TodoWithTags, SortKey } from "@/lib/todo-types";

function getWeekDays(): { date: string; label: string }[] {
	const now = new Date();
	const day = now.getDay();
	const mondayOffset = day === 0 ? -6 : 1 - day;
	const monday = new Date(now);
	monday.setDate(now.getDate() + mondayOffset);

	const WEEKDAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
	const days: { date: string; label: string }[] = [];

	for (let i = 0; i < 7; i++) {
		const d = new Date(monday);
		d.setDate(monday.getDate() + i);
		const dateStr = d.toISOString().slice(0, 10);
		const m = d.getMonth() + 1;
		const dd = d.getDate();
		days.push({
			date: dateStr,
			label: `${WEEKDAY_NAMES[i]}（${m}/${dd}）`,
		});
	}
	return days;
}

export function TodoWeekPage() {
	const {
		todos,
		tags,
		loading,
		createTodo,
		updateTodo,
		completeTodo,
		deleteTodo,
		createTag,
		deleteTag,
	} = useTodos();

	const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
	const [sortKey, setSortKey] = useState<SortKey>("priority");
	const [formOpen, setFormOpen] = useState(false);
	const [editingTodo, setEditingTodo] = useState<TodoWithTags | null>(null);

	const weekDays = useMemo(() => getWeekDays(), []);
	const today = new Date().toISOString().slice(0, 10);

	const weekStart = weekDays[0].date;
	const weekEnd = weekDays[6].date;

	const groupedByDay = useMemo(() => {
		let filtered = todos.filter((t) => {
			if (!t.due_date) return false;
			return t.due_date >= weekStart && t.due_date <= weekEnd;
		});

		if (selectedTagIds.length > 0) {
			filtered = filtered.filter((t) =>
				t.todo_tag_map?.some((m) => selectedTagIds.includes(m.tag_id)),
			);
		}

		const sortFn = (a: TodoWithTags, b: TodoWithTags) => {
			if (sortKey === "priority") {
				if (a.priority !== b.priority) return a.priority - b.priority;
				return (a.due_date ?? "").localeCompare(b.due_date ?? "");
			}
			const da = a.due_date ?? "9999-12-31";
			const db = b.due_date ?? "9999-12-31";
			if (da !== db) return da.localeCompare(db);
			return a.priority - b.priority;
		};

		const map = new Map<string, TodoWithTags[]>();
		for (const day of weekDays) {
			map.set(day.date, []);
		}
		for (const todo of filtered) {
			const arr = map.get(todo.due_date!);
			if (arr) arr.push(todo);
		}
		for (const arr of map.values()) {
			arr.sort(sortFn);
		}
		return map;
	}, [todos, weekDays, weekStart, weekEnd, selectedTagIds, sortKey]);

	const handleSave = async (form: {
		title: string;
		description: string;
		start_date: string;
		due_date: string;
		priority: number;
		is_recurring: boolean;
		recurrence_days: number;
		tag_ids: number[];
	}) => {
		if (editingTodo) {
			await updateTodo(editingTodo.id, form);
		} else {
			await createTodo(form);
		}
	};

	const handleEdit = (todo: TodoWithTags) => {
		setEditingTodo(todo);
		setFormOpen(true);
	};

	const handleDelete = async (todo: TodoWithTags) => {
		if (confirm(`确定删除「${todo.title}」？`)) {
			await deleteTodo(todo.id);
		}
	};

	const toggleSort = () => {
		setSortKey((k) => (k === "priority" ? "due_date" : "priority"));
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground">加载中…</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">本周 TODO</h1>
				<Button
					onClick={() => {
						setEditingTodo(null);
						setFormOpen(true);
					}}
					size="sm"
				>
					<Plus className="h-4 w-4" />
					添加
				</Button>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2">
				<TodoTagFilter
					tags={tags}
					selectedTagIds={selectedTagIds}
					onSelectionChange={setSelectedTagIds}
					onCreateTag={createTag}
					onDeleteTag={deleteTag}
				/>
				<Button
					variant="outline"
					size="sm"
					onClick={toggleSort}
					className="shrink-0"
				>
					<ArrowUpDown className="h-3.5 w-3.5" />
					{sortKey === "priority" ? "按优先级" : "按截止时间"}
				</Button>
			</div>

			<div className="space-y-4">
				{weekDays.map((day) => {
					const dayTodos = groupedByDay.get(day.date) ?? [];
					const isToday = day.date === today;
					const isPast = day.date < today;

					return (
						<div key={day.date}>
							<div className="flex items-center gap-2 mb-2">
								<h2
									className={
										isToday
											? "text-sm font-bold text-primary"
											: isPast
												? "text-sm font-medium text-muted-foreground"
												: "text-sm font-medium"
									}
								>
									{day.label}
									{isToday && " (今天)"}
								</h2>
								<span className="text-xs text-muted-foreground">
									{dayTodos.filter((t) => !t.completed).length} 待办
								</span>
							</div>
							{dayTodos.length === 0 ? (
								<div className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">
									无待办
								</div>
							) : (
								<div className="space-y-1.5">
									{dayTodos.map((todo) => (
										<TodoItem
											key={todo.id}
											todo={todo}
											onComplete={completeTodo}
											onEdit={handleEdit}
											onDelete={handleDelete}
										/>
									))}
								</div>
							)}
						</div>
					);
				})}
			</div>

			<TodoFormDialog
				open={formOpen}
				onOpenChange={setFormOpen}
				todo={editingTodo}
				tags={tags}
				onSave={handleSave}
			/>
		</div>
	);
}
