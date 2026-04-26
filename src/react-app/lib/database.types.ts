export type Database = {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					username: string;
					role: "admin" | "user";
					created_at: string;
				};
				Insert: {
					id: string;
					username: string;
					role?: "admin" | "user";
					created_at?: string;
				};
				Update: {
					id?: string;
					username?: string;
					role?: "admin" | "user";
					created_at?: string;
				};
				Relationships: [];
			};
			grades: {
				Row: {
					id: number;
					name: string;
					sort_order: number;
					created_at: string;
				};
				Insert: {
					name: string;
					sort_order?: number;
					created_at?: string;
				};
				Update: {
					name?: string;
					sort_order?: number;
				};
				Relationships: [];
			};
			units: {
				Row: {
					id: number;
					grade_id: number;
					name: string;
					sort_order: number;
					created_at: string;
				};
				Insert: {
					grade_id: number;
					name: string;
					sort_order?: number;
					created_at?: string;
				};
				Update: {
					grade_id?: number;
					name?: string;
					sort_order?: number;
				};
				Relationships: [
					{
						foreignKeyName: "units_grade_id_fkey";
						columns: ["grade_id"];
						isOneToOne: false;
						referencedRelation: "grades";
						referencedColumns: ["id"];
					},
				];
			};
			words: {
				Row: {
					id: number;
					unit_id: number;
					word: string;
					phonetic: string | null;
					definition: string;
					created_at: string;
				};
				Insert: {
					unit_id: number;
					word: string;
					phonetic?: string | null;
					definition: string;
					created_at?: string;
				};
				Update: {
					unit_id?: number;
					word?: string;
					phonetic?: string | null;
					definition?: string;
				};
				Relationships: [
					{
						foreignKeyName: "words_unit_id_fkey";
						columns: ["unit_id"];
						isOneToOne: false;
						referencedRelation: "units";
						referencedColumns: ["id"];
					},
				];
			};
			quiz_records: {
				Row: {
					id: number;
					user_id: string;
					word_id: number;
					quiz_type: string;
					is_correct: boolean;
					created_at: string;
				};
				Insert: {
					user_id: string;
					word_id: number;
					quiz_type: string;
					is_correct: boolean;
					created_at?: string;
				};
				Update: {
					user_id?: string;
					word_id?: number;
					quiz_type?: string;
					is_correct?: boolean;
				};
				Relationships: [
					{
						foreignKeyName: "quiz_records_word_id_fkey";
						columns: ["word_id"];
						isOneToOne: false;
						referencedRelation: "words";
						referencedColumns: ["id"];
					},
				];
			};
			wrong_words: {
				Row: {
					id: number;
					user_id: string;
					word_id: number;
					wrong_count: number;
					correct_streak: number;
					importance: number;
					mastered: boolean;
					last_wrong_at: string;
					created_at: string;
				};
				Insert: {
					user_id: string;
					word_id: number;
					wrong_count?: number;
					correct_streak?: number;
					importance?: number;
					mastered?: boolean;
					last_wrong_at?: string;
					created_at?: string;
				};
				Update: {
					wrong_count?: number;
					correct_streak?: number;
					importance?: number;
					mastered?: boolean;
					last_wrong_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "wrong_words_word_id_fkey";
						columns: ["word_id"];
						isOneToOne: false;
						referencedRelation: "words";
						referencedColumns: ["id"];
					},
				];
			};
			user_word_lists: {
				Row: {
					id: number;
					user_id: string;
					name: string;
					created_at: string;
				};
				Insert: {
					user_id: string;
					name: string;
					created_at?: string;
				};
				Update: {
					name?: string;
				};
				Relationships: [];
			};
			user_word_list_items: {
				Row: {
					id: number;
					list_id: number;
					word_id: number;
				};
				Insert: {
					list_id: number;
					word_id: number;
				};
				Update: {
					list_id?: number;
					word_id?: number;
				};
				Relationships: [
					{
						foreignKeyName: "user_word_list_items_list_id_fkey";
						columns: ["list_id"];
						isOneToOne: false;
						referencedRelation: "user_word_lists";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "user_word_list_items_word_id_fkey";
						columns: ["word_id"];
						isOneToOne: false;
						referencedRelation: "words";
						referencedColumns: ["id"];
					},
				];
			};
			cn_grades: {
				Row: {
					id: number;
					name: string;
					sort_order: number;
					created_at: string;
				};
				Insert: {
					name: string;
					sort_order?: number;
					created_at?: string;
				};
				Update: {
					name?: string;
					sort_order?: number;
				};
				Relationships: [];
			};
			cn_units: {
				Row: {
					id: number;
					grade_id: number;
					name: string;
					sort_order: number;
					created_at: string;
				};
				Insert: {
					grade_id: number;
					name: string;
					sort_order?: number;
					created_at?: string;
				};
				Update: {
					grade_id?: number;
					name?: string;
					sort_order?: number;
				};
				Relationships: [
					{
						foreignKeyName: "cn_units_grade_id_fkey";
						columns: ["grade_id"];
						isOneToOne: false;
						referencedRelation: "cn_grades";
						referencedColumns: ["id"];
					},
				];
			};
			cn_words: {
				Row: {
					id: number;
					unit_id: number;
					word: string;
					created_at: string;
				};
				Insert: {
					unit_id: number;
					word: string;
					created_at?: string;
				};
				Update: {
					unit_id?: number;
					word?: string;
				};
				Relationships: [
					{
						foreignKeyName: "cn_words_unit_id_fkey";
						columns: ["unit_id"];
						isOneToOne: false;
						referencedRelation: "cn_units";
						referencedColumns: ["id"];
					},
				];
			};
			cn_wrong_words: {
				Row: {
					id: number;
					user_id: string;
					word_id: number;
					wrong_count: number;
					correct_streak: number;
					importance: number;
					mastered: boolean;
					last_wrong_at: string;
					created_at: string;
				};
				Insert: {
					user_id: string;
					word_id: number;
					wrong_count?: number;
					correct_streak?: number;
					importance?: number;
					mastered?: boolean;
					last_wrong_at?: string;
					created_at?: string;
				};
				Update: {
					wrong_count?: number;
					correct_streak?: number;
					importance?: number;
					mastered?: boolean;
					last_wrong_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "cn_wrong_words_word_id_fkey";
						columns: ["word_id"];
						isOneToOne: false;
						referencedRelation: "cn_words";
						referencedColumns: ["id"];
					},
				];
			};
			cn_dictation_records: {
				Row: {
					id: number;
					user_id: string;
					word_id: number;
					is_correct: boolean;
					created_at: string;
				};
				Insert: {
					user_id: string;
					word_id: number;
					is_correct: boolean;
					created_at?: string;
				};
				Update: {
					user_id?: string;
					word_id?: number;
					is_correct?: boolean;
				};
				Relationships: [
					{
						foreignKeyName: "cn_dictation_records_word_id_fkey";
						columns: ["word_id"];
						isOneToOne: false;
						referencedRelation: "cn_words";
						referencedColumns: ["id"];
					},
				];
			};
			todos: {
				Row: {
					id: number;
					user_id: string;
					title: string;
					description: string;
					start_date: string | null;
					due_date: string | null;
					priority: number;
					is_recurring: boolean;
					recurrence_days: number | null;
					completed: boolean;
					completed_at: string | null;
					recurring_group_id: string | null;
					created_at: string;
				};
				Insert: {
					user_id: string;
					title: string;
					description?: string;
					start_date?: string | null;
					due_date?: string | null;
					priority?: number;
					is_recurring?: boolean;
					recurrence_days?: number | null;
					completed?: boolean;
					completed_at?: string | null;
					recurring_group_id?: string | null;
					created_at?: string;
				};
				Update: {
					title?: string;
					description?: string;
					start_date?: string | null;
					due_date?: string | null;
					priority?: number;
					is_recurring?: boolean;
					recurrence_days?: number | null;
					completed?: boolean;
					completed_at?: string | null;
					recurring_group_id?: string | null;
				};
				Relationships: [];
			};
			todo_tags: {
				Row: {
					id: number;
					user_id: string;
					name: string;
					color: string;
					created_at: string;
				};
				Insert: {
					user_id: string;
					name: string;
					color?: string;
					created_at?: string;
				};
				Update: {
					name?: string;
					color?: string;
				};
				Relationships: [];
			};
			todo_tag_map: {
				Row: {
					todo_id: number;
					tag_id: number;
				};
				Insert: {
					todo_id: number;
					tag_id: number;
				};
				Update: {
					todo_id?: number;
					tag_id?: number;
				};
				Relationships: [
					{
						foreignKeyName: "todo_tag_map_todo_id_fkey";
						columns: ["todo_id"];
						isOneToOne: false;
						referencedRelation: "todos";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "todo_tag_map_tag_id_fkey";
						columns: ["tag_id"];
						isOneToOne: false;
						referencedRelation: "todo_tags";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
}
