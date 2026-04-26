import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseSync } from "@/lib/supabase";
import type { TodoWithTags, TodoTagRow } from "@/lib/todo-types";

function addDays(dateStr: string, days: number): string {
	const d = new Date(dateStr + "T00:00:00");
	d.setDate(d.getDate() + days);
	return d.toISOString().slice(0, 10);
}

export function useTodos() {
	const { user } = useAuth();
	const [todos, setTodos] = useState<TodoWithTags[]>([]);
	const [tags, setTags] = useState<TodoTagRow[]>([]);
	const [loading, setLoading] = useState(true);

	const loadTags = useCallback(async () => {
		if (!user) return;
		const supabase = getSupabaseSync();
		const { data } = await supabase
			.from("todo_tags")
			.select("*")
			.eq("user_id", user.id)
			.order("created_at");
		if (data) setTags(data);
	}, [user]);

	const loadTodos = useCallback(async () => {
		if (!user) return;
		const supabase = getSupabaseSync();
		const { data } = await supabase
			.from("todos")
			.select("*, todo_tag_map(tag_id, todo_tags(*))")
			.eq("user_id", user.id)
			.order("created_at", { ascending: false });
		if (data) setTodos(data as TodoWithTags[]);
	}, [user]);

	const reload = useCallback(async () => {
		setLoading(true);
		await Promise.all([loadTodos(), loadTags()]);
		setLoading(false);
	}, [loadTodos, loadTags]);

	useEffect(() => {
		if (!user) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			const supabase = getSupabaseSync();
			const [todosRes, tagsRes] = await Promise.all([
				supabase
					.from("todos")
					.select("*, todo_tag_map(tag_id, todo_tags(*))")
					.eq("user_id", user.id)
					.order("created_at", { ascending: false }),
				supabase
					.from("todo_tags")
					.select("*")
					.eq("user_id", user.id)
					.order("created_at"),
			]);
			if (!cancelled) {
				if (todosRes.data) setTodos(todosRes.data as TodoWithTags[]);
				if (tagsRes.data) setTags(tagsRes.data);
				setLoading(false);
			}
		})();
		return () => { cancelled = true; };
	}, [user]);

	const createTodo = useCallback(
		async (form: {
			title: string;
			description: string;
			start_date: string;
			due_date: string;
			priority: number;
			is_recurring: boolean;
			recurrence_days: number;
			tag_ids: number[];
		}) => {
			if (!user) return;
			const supabase = getSupabaseSync();

			const groupId =
				form.is_recurring && form.recurrence_days >= 1
					? crypto.randomUUID()
					: null;

			const { data, error } = await supabase
				.from("todos")
				.insert({
					user_id: user.id,
					title: form.title,
					description: form.description || "",
					start_date: form.start_date || null,
					due_date: form.due_date || null,
					priority: form.priority,
					is_recurring: form.is_recurring,
					recurrence_days: form.is_recurring ? form.recurrence_days : null,
					recurring_group_id: groupId,
				})
				.select()
				.single();

			if (error) throw new Error(error.message);

			if (data && form.tag_ids.length > 0) {
				await supabase.from("todo_tag_map").insert(
					form.tag_ids.map((tag_id) => ({
						todo_id: data.id,
						tag_id,
					})),
				);
			}
			await reload();
		},
		[user, reload],
	);

	const updateTodo = useCallback(
		async (
			todoId: number,
			form: {
				title: string;
				description: string;
				start_date: string;
				due_date: string;
				priority: number;
				is_recurring: boolean;
				recurrence_days: number;
				tag_ids: number[];
			},
		) => {
			if (!user) return;
			const supabase = getSupabaseSync();

			await supabase
				.from("todos")
				.update({
					title: form.title,
					description: form.description || "",
					start_date: form.start_date || null,
					due_date: form.due_date || null,
					priority: form.priority,
					is_recurring: form.is_recurring,
					recurrence_days: form.is_recurring ? form.recurrence_days : null,
				})
				.eq("id", todoId);

			await supabase.from("todo_tag_map").delete().eq("todo_id", todoId);
			if (form.tag_ids.length > 0) {
				await supabase.from("todo_tag_map").insert(
					form.tag_ids.map((tag_id) => ({
						todo_id: todoId,
						tag_id,
					})),
				);
			}
			await reload();
		},
		[user, reload],
	);

	const completeTodo = useCallback(
		async (todo: TodoWithTags) => {
			if (!user) return;
			const supabase = getSupabaseSync();

			if (todo.completed) {
				await supabase
					.from("todos")
					.update({ completed: false, completed_at: null })
					.eq("id", todo.id);
			} else {
				await supabase
					.from("todos")
					.update({
						completed: true,
						completed_at: new Date().toISOString(),
					})
					.eq("id", todo.id);

				if (todo.is_recurring && todo.recurrence_days && todo.due_date) {
					const newDueDate = addDays(todo.due_date, todo.recurrence_days);
					const newStartDate = todo.start_date
						? addDays(todo.start_date, todo.recurrence_days)
						: null;

					const { data: newTodo } = await supabase
						.from("todos")
						.insert({
							user_id: user.id,
							title: todo.title,
							description: todo.description,
							start_date: newStartDate,
							due_date: newDueDate,
							priority: todo.priority,
							is_recurring: true,
							recurrence_days: todo.recurrence_days,
							recurring_group_id:
								todo.recurring_group_id || crypto.randomUUID(),
						})
						.select()
						.single();

					if (newTodo && todo.todo_tag_map?.length > 0) {
						await supabase.from("todo_tag_map").insert(
							todo.todo_tag_map.map((m) => ({
								todo_id: newTodo.id,
								tag_id: m.tag_id,
							})),
						);
					}
				}
			}
			await reload();
		},
		[user, reload],
	);

	const deleteTodo = useCallback(
		async (todoId: number) => {
			const supabase = getSupabaseSync();
			await supabase.from("todos").delete().eq("id", todoId);
			await reload();
		},
		[reload],
	);

	const createTag = useCallback(
		async (name: string, color: string) => {
			if (!user) return;
			const supabase = getSupabaseSync();
			await supabase
				.from("todo_tags")
				.insert({ user_id: user.id, name, color });
			await loadTags();
		},
		[user, loadTags],
	);

	const deleteTag = useCallback(
		async (tagId: number) => {
			const supabase = getSupabaseSync();
			await supabase.from("todo_tags").delete().eq("id", tagId);
			await loadTags();
		},
		[loadTags],
	);

	return {
		todos,
		tags,
		loading,
		createTodo,
		updateTodo,
		completeTodo,
		deleteTodo,
		createTag,
		deleteTag,
		reload,
	};
}
