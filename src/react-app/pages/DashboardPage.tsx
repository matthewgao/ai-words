import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
	AlertTriangle,
	BookOpen,
	GraduationCap,
	Target,
	XCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseSync } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const quickActions = [
	{
		to: "/grades",
		label: "词库浏览",
		desc: "按学年和单元浏览单词",
		icon: BookOpen,
		color: "text-blue-600 bg-blue-50",
	},
	{
		to: "/quiz",
		label: "开始背诵",
		desc: "选择单元开始练习",
		icon: GraduationCap,
		color: "text-green-600 bg-green-50",
	},
	{
		to: "/wrong-words",
		label: "错题本",
		desc: "复习答错的单词",
		icon: XCircle,
		color: "text-red-600 bg-red-50",
	},
];

interface Stats {
	todayCount: number;
	todayCorrect: number;
	totalWrong: number;
	importantWrong: number;
}

export function DashboardPage() {
	const { profile, user } = useAuth();
	const [stats, setStats] = useState<Stats>({
		todayCount: 0,
		todayCorrect: 0,
		totalWrong: 0,
		importantWrong: 0,
	});

	useEffect(() => {
		async function loadStats() {
			if (!user) return;
			const supabase = getSupabaseSync();
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const todayISO = today.toISOString();

			const [todayRecords, wrongWords] = await Promise.all([
				supabase
					.from("quiz_records")
					.select("is_correct")
					.eq("user_id", user.id)
					.gte("created_at", todayISO),
				supabase
					.from("wrong_words")
					.select("importance")
					.eq("user_id", user.id)
					.eq("mastered", false),
			]);

			const records = todayRecords.data || [];
			const wrongs = wrongWords.data || [];

			setStats({
				todayCount: records.length,
				todayCorrect: records.filter((r) => r.is_correct).length,
				totalWrong: wrongs.length,
				importantWrong: wrongs.filter((w) => w.importance >= 2).length,
			});
		}
		loadStats();
	}, [user]);

	const accuracy =
		stats.todayCount > 0
			? Math.round((stats.todayCorrect / stats.todayCount) * 100)
			: 0;

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">
					你好，{profile?.username}
				</h1>
				<p className="text-muted-foreground">准备好今天的学习了吗？</p>
			</div>

			{/* 今日统计 */}
			<div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
							<GraduationCap className="h-5 w-5" />
						</div>
						<div>
							<p className="text-2xl font-bold">
								{stats.todayCount}
							</p>
							<p className="text-xs text-muted-foreground">
								今日练习
							</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
							<Target className="h-5 w-5" />
						</div>
						<div>
							<p className="text-2xl font-bold">{accuracy}%</p>
							<p className="text-xs text-muted-foreground">
								正确率
							</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
							<XCircle className="h-5 w-5" />
						</div>
						<div>
							<p className="text-2xl font-bold">
								{stats.totalWrong}
							</p>
							<p className="text-xs text-muted-foreground">
								错题数
							</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
							<AlertTriangle className="h-5 w-5" />
						</div>
						<div>
							<p className="text-2xl font-bold">
								{stats.importantWrong}
							</p>
							<p className="text-xs text-muted-foreground">
								重点关注
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* 快捷入口 */}
			<div className="grid gap-4 sm:grid-cols-3">
				{quickActions.map((action) => (
					<Link key={action.to} to={action.to}>
						<Card className="transition-shadow hover:shadow-md">
							<CardHeader className="flex flex-row items-center gap-3 pb-2">
								<div
									className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}
								>
									<action.icon className="h-5 w-5" />
								</div>
								<CardTitle className="text-base">
									{action.label}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">
									{action.desc}
								</p>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>
		</div>
	);
}
