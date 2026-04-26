import { useMemo, useState } from "react";
import { Plus, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TodoItem } from "@/components/TodoItem";
import { TodoFormDialog } from "@/components/TodoFormDialog";
import { TodoTagFilter } from "@/components/TodoTagFilter";
import { useTodos } from "@/hooks/useTodos";
import type { TodoWithTags, SortKey } from "@/lib/todo-types";

function getToday(): string {
	return new Date().toISOString().slice(0, 10);
}

export function TodoTodayPage() {
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

	const today = getToday();

	const todayTodos = useMemo(() => {
		let filtered = todos.filter((t) => {
			if (t.completed) return false;
			if (!t.due_date) return false;
			return t.due_date <= today;
		});

		if (selectedTagIds.length > 0) {
			filtered = filtered.filter((t) =>
				t.todo_tag_map?.some((m) => selectedTagIds.includes(m.tag_id)),
			);
		}

		filtered.sort((a, b) => {
			if (sortKey === "priority") {
				if (a.priority !== b.priority) return a.priority - b.priority;
				return (a.due_date ?? "").localeCompare(b.due_date ?? "");
			}
			const da = a.due_date ?? "9999-12-31";
			const db = b.due_date ?? "9999-12-31";
			if (da !== db) return da.localeCompare(db);
			return a.priority - b.priority;
		});

		return filtered;
	}, [todos, today, selectedTagIds, sortKey]);

	const completedToday = useMemo(() => {
		return todos.filter(
			(t) =>
				t.completed &&
				t.completed_at &&
				t.completed_at.slice(0, 10) === today,
		);
	}, [todos, today]);

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
				<h1 className="text-2xl font-bold">今日 TODO</h1>
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

			{todayTodos.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
					<p className="text-muted-foreground">
						今天没有待办事项
					</p>
					<Button
						variant="link"
						onClick={() => {
							setEditingTodo(null);
							setFormOpen(true);
						}}
						className="mt-1"
					>
						创建一个
					</Button>
				</div>
			) : (
				<div className="space-y-2">
					{todayTodos.map((todo) => (
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

			{completedToday.length > 0 && (
				<div className="space-y-2">
					<h2 className="text-sm font-medium text-muted-foreground">
						今日已完成（{completedToday.length}）
					</h2>
					{completedToday.map((todo) => (
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
