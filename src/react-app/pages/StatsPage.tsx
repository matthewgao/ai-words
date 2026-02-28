import { useEffect, useMemo, useState } from "react";
import {
	AlertTriangle,
	GraduationCap,
	Target,
	XCircle,
} from "lucide-react";
import {
	BarChart,
	Bar,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseSync } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QuizRecord {
	is_correct: boolean;
	created_at: string;
}

interface DailyData {
	date: string;
	label: string;
	count: number;
	correct: number;
	wrong: number;
	accuracy: number;
}

type RangeKey = "7" | "14" | "30";

function formatDate(d: Date): string {
	const m = d.getMonth() + 1;
	const day = d.getDate();
	return `${m}/${day}`;
}

function toDateKey(dateStr: string): string {
	return dateStr.slice(0, 10);
}

function buildEmptyDays(days: number): Map<string, DailyData> {
	const map = new Map<string, DailyData>();
	const now = new Date();
	for (let i = days - 1; i >= 0; i--) {
		const d = new Date(now);
		d.setDate(d.getDate() - i);
		const key = d.toISOString().slice(0, 10);
		map.set(key, {
			date: key,
			label: formatDate(d),
			count: 0,
			correct: 0,
			wrong: 0,
			accuracy: 0,
		});
	}
	return map;
}

export function StatsPage() {
	const { user } = useAuth();
	const [range, setRange] = useState<RangeKey>("7");
	const [records, setRecords] = useState<QuizRecord[]>([]);
	const [importantWrong, setImportantWrong] = useState(0);
	const [loading, setLoading] = useState(true);

	const days = Number(range);

	useEffect(() => {
		async function load() {
			if (!user) return;
			setLoading(true);
			const supabase = getSupabaseSync();

			const startDate = new Date();
			startDate.setDate(startDate.getDate() - days + 1);
			startDate.setHours(0, 0, 0, 0);

			const [quizRes, wrongRes] = await Promise.all([
				supabase
					.from("quiz_records")
					.select("is_correct, created_at")
					.eq("user_id", user.id)
					.gte("created_at", startDate.toISOString())
					.order("created_at", { ascending: true }),
				supabase
					.from("wrong_words")
					.select("importance")
					.eq("user_id", user.id)
					.eq("mastered", false)
					.gte("importance", 2),
			]);

			setRecords(quizRes.data || []);
			setImportantWrong(wrongRes.data?.length ?? 0);
			setLoading(false);
		}
		load();
	}, [user, days]);

	const { dailyData, totalCount, totalCorrect, totalWrong, avgAccuracy } =
		useMemo(() => {
			const map = buildEmptyDays(days);

			for (const r of records) {
				const key = toDateKey(r.created_at);
				const entry = map.get(key);
				if (entry) {
					entry.count++;
					if (r.is_correct) entry.correct++;
					else entry.wrong++;
				}
			}

			let tc = 0;
			let tCorrect = 0;
			let tWrong = 0;

			const data = Array.from(map.values());
			for (const d of data) {
				d.accuracy = d.count > 0 ? Math.round((d.correct / d.count) * 100) : 0;
				tc += d.count;
				tCorrect += d.correct;
				tWrong += d.wrong;
			}

			return {
				dailyData: data,
				totalCount: tc,
				totalCorrect: tCorrect,
				totalWrong: tWrong,
				avgAccuracy: tc > 0 ? Math.round((tCorrect / tc) * 100) : 0,
			};
		}, [records, days]);

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">学习统计</h1>
					<p className="text-muted-foreground">查看你的学习趋势和数据</p>
				</div>
				<Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)}>
					<TabsList>
						<TabsTrigger value="7">近 7 天</TabsTrigger>
						<TabsTrigger value="14">近 14 天</TabsTrigger>
						<TabsTrigger value="30">近 30 天</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{/* 汇总卡片 */}
			<div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
							<GraduationCap className="h-5 w-5" />
						</div>
						<div>
							<p className="text-2xl font-bold">{loading ? "-" : totalCount}</p>
							<p className="text-xs text-muted-foreground">总练习数</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
							<Target className="h-5 w-5" />
						</div>
						<div>
							<p className="text-2xl font-bold">
								{loading ? "-" : `${avgAccuracy}%`}
							</p>
							<p className="text-xs text-muted-foreground">平均正确率</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
							<XCircle className="h-5 w-5" />
						</div>
						<div>
							<p className="text-2xl font-bold">{loading ? "-" : totalWrong}</p>
							<p className="text-xs text-muted-foreground">总错题数</p>
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
								{loading ? "-" : importantWrong}
							</p>
							<p className="text-xs text-muted-foreground">重点关注</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* 每日练习数量 */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">每日练习数量</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-64">
						{loading ? (
							<ChartSkeleton />
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={dailyData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
									<CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
									<XAxis
										dataKey="label"
										tickLine={false}
										axisLine={false}
										className="text-xs fill-muted-foreground"
										interval={days > 14 ? 2 : 0}
									/>
									<YAxis
										tickLine={false}
										axisLine={false}
										className="text-xs fill-muted-foreground"
										allowDecimals={false}
									/>
									<Tooltip
										content={<CustomTooltip suffix="题" />}
									/>
									<Bar
										dataKey="count"
										fill="var(--color-chart-2)"
										radius={[4, 4, 0, 0]}
										maxBarSize={40}
									/>
								</BarChart>
							</ResponsiveContainer>
						)}
					</div>
				</CardContent>
			</Card>

			{/* 每日正确率 */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">每日正确率</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-64">
						{loading ? (
							<ChartSkeleton />
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={dailyData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
									<CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
									<XAxis
										dataKey="label"
										tickLine={false}
										axisLine={false}
										className="text-xs fill-muted-foreground"
										interval={days > 14 ? 2 : 0}
									/>
									<YAxis
										tickLine={false}
										axisLine={false}
										className="text-xs fill-muted-foreground"
										domain={[0, 100]}
										tickFormatter={(v) => `${v}%`}
									/>
									<Tooltip
										content={<CustomTooltip suffix="%" />}
									/>
									<Line
										type="monotone"
										dataKey="accuracy"
										stroke="var(--color-chart-4)"
										strokeWidth={2}
										dot={{ r: 3, fill: "var(--color-chart-4)" }}
										activeDot={{ r: 5 }}
									/>
								</LineChart>
							</ResponsiveContainer>
						)}
					</div>
				</CardContent>
			</Card>

			{/* 每日错题数 */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">每日错题数</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-64">
						{loading ? (
							<ChartSkeleton />
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={dailyData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
									<CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
									<XAxis
										dataKey="label"
										tickLine={false}
										axisLine={false}
										className="text-xs fill-muted-foreground"
										interval={days > 14 ? 2 : 0}
									/>
									<YAxis
										tickLine={false}
										axisLine={false}
										className="text-xs fill-muted-foreground"
										allowDecimals={false}
									/>
									<Tooltip
										content={<CustomTooltip suffix="题" />}
									/>
									<Bar
										dataKey="wrong"
										fill="var(--color-chart-1)"
										radius={[4, 4, 0, 0]}
										maxBarSize={40}
									/>
								</BarChart>
							</ResponsiveContainer>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function CustomTooltip({
	active,
	payload,
	label,
	suffix,
}: {
	active?: boolean;
	payload?: Array<{ value: number }>;
	label?: string;
	suffix: string;
}) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-lg border bg-background px-3 py-2 shadow-md">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="text-sm font-semibold">
				{payload[0].value}
				{suffix}
			</p>
		</div>
	);
}

function ChartSkeleton() {
	return (
		<div className="flex h-full items-center justify-center">
			<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
		</div>
	);
}
