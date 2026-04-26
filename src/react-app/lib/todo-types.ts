import type { Database } from "./database.types";

export type TodoRow = Database["public"]["Tables"]["todos"]["Row"];
export type TodoInsert = Database["public"]["Tables"]["todos"]["Insert"];
export type TodoTagRow = Database["public"]["Tables"]["todo_tags"]["Row"];

export interface TodoWithTags extends TodoRow {
	todo_tag_map: Array<{
		tag_id: number;
		todo_tags: TodoTagRow;
	}>;
}

export const PRIORITY_CONFIG = {
	1: { label: "高", color: "text-red-600", bg: "bg-red-100", border: "border-red-300" },
	2: { label: "中", color: "text-yellow-600", bg: "bg-yellow-100", border: "border-yellow-300" },
	3: { label: "低", color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-300" },
} as const;

export type SortKey = "priority" | "due_date";
