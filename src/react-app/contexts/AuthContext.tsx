import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

interface Profile {
	id: string;
	username: string;
	role: "admin" | "user";
}

interface AuthState {
	user: User | null;
	profile: Profile | null;
	session: Session | null;
	loading: boolean;
	isAdmin: boolean;
}

interface AuthContextValue extends AuthState {
	signIn: (email: string, password: string) => Promise<{ error: string | null }>;
	signUp: (
		email: string,
		password: string,
		username: string,
	) => Promise<{ error: string | null }>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [state, setState] = useState<AuthState>({
		user: null,
		profile: null,
		session: null,
		loading: true,
		isAdmin: false,
	});

	const fetchProfile = useCallback(async (userId: string) => {
		const supabase = await getSupabase();
		const { data } = await supabase
			.from("profiles")
			.select("id, username, role")
			.eq("id", userId)
			.single();
		return data as Profile | null;
	}, []);

	useEffect(() => {
		let mounted = true;

		async function init() {
			try {
				const supabase = await getSupabase();

				const {
					data: { session },
				} = await supabase.auth.getSession();

				if (session?.user && mounted) {
					const profile = await fetchProfile(session.user.id);
					setState({
						user: session.user,
						profile,
						session,
						loading: false,
						isAdmin: profile?.role === "admin",
					});
				} else if (mounted) {
					setState((s) => ({ ...s, loading: false }));
				}

				const {
					data: { subscription },
				} = supabase.auth.onAuthStateChange(
					async (_event, newSession) => {
						if (!mounted) return;
						if (newSession?.user) {
							const profile = await fetchProfile(
								newSession.user.id,
							);
							setState({
								user: newSession.user,
								profile,
								session: newSession,
								loading: false,
								isAdmin: profile?.role === "admin",
							});
						} else {
							setState({
								user: null,
								profile: null,
								session: null,
								loading: false,
								isAdmin: false,
							});
						}
					},
				);

				return () => {
					subscription.unsubscribe();
				};
			} catch (err) {
				console.error("Auth initialization failed:", err);
				if (mounted) {
					setState((s) => ({ ...s, loading: false }));
				}
			}
		}

		const cleanup = init();
		return () => {
			mounted = false;
			cleanup.then((unsub) => unsub?.());
		};
	}, [fetchProfile]);

	const signIn = useCallback(
		async (email: string, password: string) => {
			const supabase = await getSupabase();
			const { error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});
			return { error: error?.message ?? null };
		},
		[],
	);

	const signUp = useCallback(
		async (email: string, password: string, username: string) => {
			const supabase = await getSupabase();
			const { error } = await supabase.auth.signUp({
				email,
				password,
				options: { data: { username } },
			});
			return { error: error?.message ?? null };
		},
		[],
	);

	const signOut = useCallback(async () => {
		const supabase = await getSupabase();
		await supabase.auth.signOut();
	}, []);

	const value = useMemo(
		() => ({ ...state, signIn, signUp, signOut }),
		[state, signIn, signUp, signOut],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
