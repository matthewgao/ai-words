import { Link, Outlet, useLocation } from "react-router-dom";
import {
	BookOpen,
	GraduationCap,
	Home,
	LogOut,
	Settings,
	XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const navItems = [
	{ to: "/", label: "首页", icon: Home },
	{ to: "/grades", label: "词库", icon: BookOpen },
	{ to: "/quiz", label: "背诵", icon: GraduationCap },
	{ to: "/wrong-words", label: "错题本", icon: XCircle },
];

const adminItems = [{ to: "/admin", label: "管理", icon: Settings }];

export function AppLayout() {
	const { pathname } = useLocation();
	const { profile, signOut, isAdmin } = useAuth();

	const allItems = isAdmin ? [...navItems, ...adminItems] : navItems;

	return (
		<div className="flex h-screen bg-background">
			{/* Sidebar */}
			<aside className="hidden w-60 flex-col border-r bg-sidebar md:flex">
				<div className="flex h-14 items-center border-b px-4">
					<GraduationCap className="mr-2 h-6 w-6 text-primary" />
					<span className="text-lg font-bold">高清远来背单词</span>
				</div>

				<nav className="flex-1 space-y-1 p-3">
					{allItems.map((item) => (
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
					))}
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

			{/* Mobile bottom nav */}
			<nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t bg-background md:hidden">
				{allItems.map((item) => (
					<Link
						key={item.to}
						to={item.to}
						className={cn(
							"flex flex-1 flex-col items-center gap-1 py-2 text-xs",
							pathname === item.to
								? "text-primary"
								: "text-muted-foreground",
						)}
					>
						<item.icon className="h-5 w-5" />
						{item.label}
					</Link>
				))}
			</nav>

			{/* Main content */}
			<main className="flex-1 overflow-y-auto pb-16 md:pb-0">
				<div className="mx-auto max-w-4xl p-4 md:p-8">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
