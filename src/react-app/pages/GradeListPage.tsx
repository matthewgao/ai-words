import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronRight } from "lucide-react";
import { getSupabaseSync } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UnitInfo {
	id: number;
	name: string;
	sort_order: number;
	word_count: number;
}

interface GradeWithUnits {
	id: number;
	name: string;
	sort_order: number;
	units: UnitInfo[];
}

export function GradeListPage() {
	const [grades, setGrades] = useState<GradeWithUnits[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function load() {
			const supabase = getSupabaseSync();
			const { data: gradesData } = await supabase
				.from("grades")
				.select("id, name, sort_order")
				.order("sort_order");

			if (!gradesData) {
				setLoading(false);
				return;
			}

			const { data: unitsData } = await supabase
				.from("units")
				.select("id, grade_id, name, sort_order, words(count)")
				.order("sort_order");

			const result: GradeWithUnits[] = gradesData.map((g) => ({
				id: g.id,
				name: g.name,
				sort_order: g.sort_order,
				units: (unitsData || [])
					.filter((u) => u.grade_id === g.id)
					.map((u) => ({
						id: u.id,
						name: u.name,
						sort_order: u.sort_order,
						word_count:
							(u.words as unknown as Array<{ count: number }>)?.[0]
								?.count ?? 0,
					})),
			}));

			setGrades(result);
			setLoading(false);
		}
		load();
	}, []);

	if (loading) {
		return (
			<div className="flex justify-center py-12">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">词库</h1>
				<p className="text-muted-foreground">按学年和单元浏览单词</p>
			</div>

			{grades.length === 0 ? (
				<div className="flex flex-col items-center py-12 text-muted-foreground">
					<BookOpen className="mb-2 h-10 w-10" />
					<p>暂无词库，请联系管理员添加</p>
				</div>
			) : (
				<div className="space-y-4">
					{grades.map((grade) => (
						<Card key={grade.id}>
							<CardHeader className="pb-3">
								<CardTitle className="text-lg">
									{grade.name}
								</CardTitle>
							</CardHeader>
							<CardContent>
								{grade.units.length === 0 ? (
									<p className="text-sm text-muted-foreground">
										暂无单元
									</p>
								) : (
									<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
										{grade.units.map((unit) => (
											<Link
												key={unit.id}
												to={`/grades/${grade.id}/units/${unit.id}`}
												className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted"
											>
												<div>
													<span className="font-medium text-sm">
														{unit.name}
													</span>
													<p className="text-xs text-muted-foreground">
														{unit.word_count} 个单词
													</p>
												</div>
												<ChevronRight className="h-4 w-4 text-muted-foreground" />
											</Link>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
