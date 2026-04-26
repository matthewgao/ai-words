import { useMemo } from "react";
import { CheckCircle2, Clock, ListChecks, TrendingUp } from "lucide-react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTodos } from "@/hooks/useTodos";
import { useState } from "react";

type ViewMode = "day" | "week" | "month";

interface ChartDataPoint {
	label: string;
	completed: number;
	created: number;
}

function formatDateShort(d: Date): string {
	return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getWeekLabel(d: Date): string {
	const start = new Date(d);
	const day = start.getDay();
	start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
	const end = new Date(start);
	end.setDate(start.getDate() + 6);
	return `${formatDateShort(start)}-${formatDateShort(end)}`;
}

function getMonthLabel(d: Date): string {
	return `${d.getFullYear()}/${d.getMonth() + 1}`;
}

function getWeekKey(d: Date): string {
	const start = new Date(d);
	const day = start.getDay();
	start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
	return start.toISOString().slice(0, 10);
}

function getMonthKey(d: Date): string {
	return d.toISOString().slice(0, 7);
}

export function TodoStatsPage() {
	const { todos, loading } = useTodos();
	const [viewMode, setViewMode] = useState<ViewMode>("day");

	const dayRange = viewMode === "day" ? 30 : 0;
	const weekRange = viewMode === "week" ? 8 : 0;
	const monthRange = viewMode === "month" ? 6 : 0;

	const { chartData, totalCreated, totalCompleted, completionRate } =
		useMemo(() => {
			if (viewMode === "day") {
				const map = new Map<string, ChartDataPoint>();
				const now = new Date();
				for (let i = dayRange - 1; i >= 0; i--) {
					const d = new Date(now);
					d.setDate(d.getDate() - i);
					const key = d.toISOString().slice(0, 10);
					map.set(key, { label: formatDateShort(d), completed: 0, created: 0 });
				}

				const startKey = Array.from(map.keys())[0];
				for (const todo of todos) {
					const createdKey = todo.created_at.slice(0, 10);
					if (createdKey >= startKey) {
						const entry = map.get(createdKey);
						if (entry) entry.created++;
					}
					if (todo.completed && todo.completed_at) {
						const completedKey = todo.completed_at.slice(0, 10);
						if (completedKey >= startKey) {
							const entry = map.get(completedKey);
							if (entry) entry.completed++;
						}
					}
				}

				const data = Array.from(map.values());
				const tc = data.reduce((s, d) => s + d.created, 0);
				const cc = data.reduce((s, d) => s + d.completed, 0);
				return {
					chartData: data,
					totalCreated: tc,
					totalCompleted: cc,
					completionRate: tc > 0 ? Math.round((cc / tc) * 100) : 0,
				};
			}

			if (viewMode === "week") {
				const map = new Map<string, ChartDataPoint>();
				const now = new Date();
				for (let i = weekRange - 1; i >= 0; i--) {
					const d = new Date(now);
					d.setDate(d.getDate() - i * 7);
					const key = getWeekKey(d);
					if (!map.has(key)) {
						map.set(key, { label: getWeekLabel(d), completed: 0, created: 0 });
					}
				}

				const keys = Array.from(map.keys());
				const startKey = keys[0];
				for (const todo of todos) {
					const cd = new Date(todo.created_at);
					const createdWeekKey = getWeekKey(cd);
					if (createdWeekKey >= startKey) {
						const entry = map.get(createdWeekKey);
						if (entry) entry.created++;
					}
					if (todo.completed && todo.completed_at) {
						const cd2 = new Date(todo.completed_at);
						const completedWeekKey = getWeekKey(cd2);
						if (completedWeekKey >= startKey) {
							const entry = map.get(completedWeekKey);
							if (entry) entry.completed++;
						}
					}
				}

				const data = Array.from(map.values());
				const tc = data.reduce((s, d) => s + d.created, 0);
				const cc = data.reduce((s, d) => s + d.completed, 0);
				return {
					chartData: data,
					totalCreated: tc,
					totalCompleted: cc,
					completionRate: tc > 0 ? Math.round((cc / tc) * 100) : 0,
				};
			}

			// month
			const map = new Map<string, ChartDataPoint>();
			const now = new Date();
			for (let i = monthRange - 1; i >= 0; i--) {
				const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
				const key = getMonthKey(d);
				map.set(key, { label: getMonthLabel(d), completed: 0, created: 0 });
			}

			const keys = Array.from(map.keys());
			const startKey = keys[0];
			for (const todo of todos) {
				const cd = new Date(todo.created_at);
				const createdMonthKey = getMonthKey(cd);
				if (createdMonthKey >= startKey) {
					const entry = map.get(createdMonthKey);
					if (entry) entry.created++;
				}
				if (todo.completed && todo.completed_at) {
					const cd2 = new Date(todo.completed_at);
					const completedMonthKey = getMonthKey(cd2);
					if (completedMonthKey >= startKey) {
						const entry = map.get(completedMonthKey);
						if (entry) entry.completed++;
					}
				}
			}

			const data = Array.from(map.values());
			const tc = data.reduce((s, d) => s + d.created, 0);
			const cc = data.reduce((s, d) => s + d.completed, 0);
			return {
				chartData: data,
				totalCreated: tc,
				totalCompleted: cc,
				completionRate: tc > 0 ? Math.round((cc / tc) * 100) : 0,
			};
		}, [todos, viewMode, dayRange, weekRange, monthRange]);

	const pendingCount = todos.filter((t) => !t.completed).length;

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">TODO 完成统计</h1>
					<p className="text-muted-foreground">查看待办事项的完成趋势</p>
				</div>
				<Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
					<TabsList>
						<TabsTrigger value="day">按天</TabsTrigger>
						<TabsTrigger value="week">按周</TabsTrigger>
						<TabsTrigger value="month">按月</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			<div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
							<ListChecks className="h-5 w-5" />
						</div>
						<div>
							<p className="text-2xl font-bold">
								{loading ? "-" : totalCreated}
							</p>
							<p className="text-xs text-muted-foreground">创建总数</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
							<CheckCircle2 className="h-5 w-5" />
						</div>
						<div>
							<p className="text-2xl font-bold">
								{loading ? "-" : totalCompleted}
							</p>
							<p className="text-xs text-muted-foreground">已完成</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
							<TrendingUp className="h-5 w-5" />
						</div>
						<div>
							<p className="text-2xl font-bold">
								{loading ? "-" : `${completionRate}%`}
							</p>
							<p className="text-xs text-muted-foreground">完成率</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
							<Clock className="h-5 w-5" />
						</div>
						<div>
							<p className="text-2xl font-bold">
								{loading ? "-" : pendingCount}
							</p>
							<p className="text-xs text-muted-foreground">待完成</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">
						{viewMode === "day" && "每日完成数量（近30天）"}
						{viewMode === "week" && "每周完成数量（近8周）"}
						{viewMode === "month" && "每月完成数量（近6月）"}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-64">
						{loading ? (
							<ChartSkeleton />
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={chartData}
									margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
								>
									<CartesianGrid
										strokeDasharray="3 3"
										vertical={false}
										className="stroke-border"
									/>
									<XAxis
										dataKey="label"
										tickLine={false}
										axisLine={false}
										className="text-xs fill-muted-foreground"
										interval={viewMode === "day" ? 2 : 0}
									/>
									<YAxis
										tickLine={false}
										axisLine={false}
										className="text-xs fill-muted-foreground"
										allowDecimals={false}
									/>
									<Tooltip content={<CustomTooltip />} />
									<Bar
										dataKey="completed"
										name="已完成"
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

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">
						{viewMode === "day" && "每日新增数量（近30天）"}
						{viewMode === "week" && "每周新增数量（近8周）"}
						{viewMode === "month" && "每月新增数量（近6月）"}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-64">
						{loading ? (
							<ChartSkeleton />
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={chartData}
									margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
								>
									<CartesianGrid
										strokeDasharray="3 3"
										vertical={false}
										className="stroke-border"
									/>
									<XAxis
										dataKey="label"
										tickLine={false}
										axisLine={false}
										className="text-xs fill-muted-foreground"
										interval={viewMode === "day" ? 2 : 0}
									/>
									<YAxis
										tickLine={false}
										axisLine={false}
										className="text-xs fill-muted-foreground"
										allowDecimals={false}
									/>
									<Tooltip content={<CustomTooltipCreated />} />
									<Bar
										dataKey="created"
										name="新增"
										fill="var(--color-chart-4)"
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
}: {
	active?: boolean;
	payload?: Array<{ value: number }>;
	label?: string;
}) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-lg border bg-background px-3 py-2 shadow-md">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="text-sm font-semibold">{payload[0].value} 项已完成</p>
		</div>
	);
}

function CustomTooltipCreated({
	active,
	payload,
	label,
}: {
	active?: boolean;
	payload?: Array<{ value: number }>;
	label?: string;
}) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-lg border bg-background px-3 py-2 shadow-md">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="text-sm font-semibold">{payload[0].value} 项新增</p>
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
