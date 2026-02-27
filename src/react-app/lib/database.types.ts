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
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
}
