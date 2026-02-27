import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
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

export function RegisterPage() {
	const { signUp, user, loading: authLoading } = useAuth();
	const navigate = useNavigate();
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	if (!authLoading && user) return <Navigate to="/" replace />;

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		if (password.length < 6) {
			setError("密码至少需要 6 个字符");
			return;
		}

		setLoading(true);
		const { error: err } = await signUp(email, password, username);
		setLoading(false);

		if (err) {
			setError(err);
		} else {
			navigate("/login", {
				state: { message: "注册成功，请登录" },
			});
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<CardHeader className="text-center">
					<div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
						<GraduationCap className="h-6 w-6 text-primary" />
					</div>
					<CardTitle>注册</CardTitle>
					<CardDescription>创建账号加入背单词</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						{error && (
							<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
								{error}
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="username">用户名</Label>
							<Input
								id="username"
								type="text"
								placeholder="你的昵称"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								required
							/>
						</div>
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
								placeholder="至少 6 个字符"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								autoComplete="new-password"
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
							注册
						</Button>
						<p className="text-sm text-muted-foreground">
							已有账号？{" "}
							<Link
								to="/login"
								className="text-primary hover:underline"
							>
								登录
							</Link>
						</p>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
