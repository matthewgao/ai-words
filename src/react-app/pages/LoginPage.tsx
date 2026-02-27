import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { GraduationCap, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function LoginPage() {
	const { signIn, user, loading: authLoading } = useAuth();
	const location = useLocation();
	const successMessage = (location.state as { message?: string } | null)
		?.message;
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	if (!authLoading && user) return <Navigate to="/" replace />;

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setLoading(true);

		const { error: err } = await signIn(email, password);
		if (err) setError(err);
		setLoading(false);
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<CardHeader className="text-center">
					<div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
						<GraduationCap className="h-6 w-6 text-primary" />
					</div>
					<CardTitle>登录</CardTitle>
					<CardDescription>登录你的账号开始背单词</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						{successMessage && (
							<div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
								{successMessage}
							</div>
						)}
						{error && (
							<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
								{error}
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="email">邮箱</Label>
							<Input
								id="email"
								type="email"
								placeholder="your@email.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								autoComplete="email"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">密码</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								autoComplete="current-password"
							/>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col gap-3">
						<Button
							type="submit"
							className="w-full"
							disabled={loading}
						>
							{loading && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							登录
						</Button>
						<p className="text-sm text-muted-foreground">
							还没有账号？{" "}
							<Link
								to="/register"
								className="text-primary hover:underline"
							>
								注册
							</Link>
						</p>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
