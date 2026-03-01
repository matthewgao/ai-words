import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
	BarChart3,
	BookOpen,
	BookText,
	ChevronRight,
	GraduationCap,
	Home,
	Languages,
	ListTodo,
	LogOut,
	Mic,
	Settings,
	XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface NavItem {
	to: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
	key: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	to: string;
	items: NavItem[] | null;
}

const navGroups: NavGroup[] = [
	{
		key: "todo",
		label: "TODO",
		icon: ListTodo,
		to: "/todo",
		items: null,
	},
	{
		key: "english",
		label: "英语",
		icon: Languages,
		to: "/",
		items: [
			{ to: "/", label: "概览", icon: Home },
			{ to: "/grades", label: "词库", icon: BookOpen },
			{ to: "/quiz", label: "背诵", icon: GraduationCap },
			{ to: "/wrong-words", label: "错题本", icon: XCircle },
			{ to: "/stats", label: "统计", icon: BarChart3 },
		],
	},
	{
		key: "chinese",
		label: "语文",
		icon: BookText,
		to: "/chinese/dictation",
		items: [
			{ to: "/chinese/dictation", label: "辅助默写", icon: Mic },
			{ to: "/chinese/wrong-words", label: "错题本", icon: XCircle },
		],
	},
];

const adminGroup: NavGroup = {
	key: "admin",
	label: "管理",
	icon: Settings,
	to: "/admin",
	items: [
		{ to: "/admin", label: "英语", icon: Languages },
		{ to: "/admin/chinese", label: "语文", icon: BookText },
	],
};

function getActiveGroupKey(pathname: string, groups: NavGroup[]): string | null {
	for (const group of groups) {
		if (group.items) {
			for (const item of group.items) {
				if (item.to === "/") {
					if (pathname === "/") return group.key;
				} else if (
					pathname === item.to ||
					pathname.startsWith(item.to + "/")
				) {
					return group.key;
				}
			}
		} else if (group.to) {
			if (
				pathname === group.to ||
				pathname.startsWith(group.to + "/")
			) {
				return group.key;
			}
		}
	}
	return null;
}

export function AppLayout() {
	const { pathname } = useLocation();
	const { profile, signOut, isAdmin } = useAuth();
	const [expanded, setExpanded] = useState<Record<string, boolean>>({
		english: true,
	});

	const toggleGroup = (key: string) => {
		setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const allGroups = isAdmin ? [...navGroups, adminGroup] : navGroups;
	const activeGroupKey = getActiveGroupKey(pathname, allGroups);
	const activeGroup = allGroups.find((g) => g.key === activeGroupKey);

	return (
		<div className="flex h-screen bg-background">
			{/* Sidebar */}
			<aside className="hidden w-60 flex-col border-r bg-sidebar md:flex">
				<div className="flex h-14 items-center border-b px-4">
					<GraduationCap className="mr-2 h-6 w-6 text-primary" />
					<span className="text-lg font-bold">高清远来背单词</span>
				</div>

				<nav className="flex-1 overflow-y-auto p-3">
					<div className="space-y-1">
						{allGroups.map((group) => (
							<div key={group.key}>
								<button
									type="button"
									onClick={() => toggleGroup(group.key)}
									className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
									aria-label={`${expanded[group.key] ? "折叠" : "展开"}${group.label}`}
								>
									<group.icon className="h-4 w-4" />
									<span className="flex-1 text-left">
										{group.label}
									</span>
									<ChevronRight
										className={cn(
											"h-4 w-4 transition-transform",
											expanded[group.key] && "rotate-90",
										)}
									/>
								</button>

								{expanded[group.key] && (
									<div className="ml-3 mt-1 space-y-1 border-l pl-3">
										{group.items ? (
											group.items.map((item) => (
												<Link
													key={item.to}
													to={item.to}
													className={cn(
														"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
														pathname === item.to
															? "bg-sidebar-accent text-sidebar-accent-foreground"
															: "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
													)}
												>
													<item.icon className="h-4 w-4" />
													{item.label}
												</Link>
											))
										) : (
											<span className="block px-3 py-2 text-sm text-muted-foreground/60">
												待开发
											</span>
										)}
									</div>
								)}
							</div>
						))}
					</div>
				</nav>

				<div className="border-t p-3">
					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground truncate">
							{profile?.username}
						</span>
						<Button
							variant="ghost"
							size="icon"
							onClick={signOut}
							aria-label="退出登录"
						>
							<LogOut className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</aside>

			{/* Mobile secondary nav */}
			{activeGroup?.items && (
				<nav className="fixed top-0 left-0 right-0 z-50 flex overflow-x-auto border-b bg-background md:hidden">
					{activeGroup.items.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							className={cn(
								"flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
								pathname === item.to
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground",
							)}
						>
							{item.label}
						</Link>
					))}
				</nav>
			)}

			{/* Mobile bottom nav */}
			<nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t bg-background md:hidden">
				{allGroups.map((group) => (
					<Link
						key={group.key}
						to={group.to}
						className={cn(
							"flex flex-1 flex-col items-center gap-1 py-2 text-xs",
							activeGroupKey === group.key
								? "text-primary"
								: "text-muted-foreground",
						)}
					>
						<group.icon className="h-5 w-5" />
						{group.label}
					</Link>
				))}
			</nav>

			{/* Main content */}
			<main className="flex-1 overflow-y-auto pb-16 md:pb-0">
				<div
					className={cn(
						"mx-auto max-w-4xl p-4 md:p-8",
						activeGroup?.items && "pt-14 md:pt-8",
					)}
				>
					<Outlet />
				</div>
			</main>
		</div>
	);
}
