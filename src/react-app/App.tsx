import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { GradeListPage } from "@/pages/GradeListPage";
import { UnitWordsPage } from "@/pages/UnitWordsPage";
import { QuizSetupPage } from "@/pages/QuizSetupPage";
import { QuizPlayPage } from "@/pages/QuizPlayPage";
import { QuizResultPage } from "@/pages/QuizResultPage";
import { WrongWordsPage } from "@/pages/WrongWordsPage";
import { StatsPage } from "@/pages/StatsPage";
import { AdminPage } from "@/pages/AdminPage";
import { AdminChinesePage } from "@/pages/AdminChinesePage";
import { ChineseDictationSetupPage } from "@/pages/ChineseDictationSetupPage";
import { ChineseDictationPlayPage } from "@/pages/ChineseDictationPlayPage";
import { ChineseDictationResultPage } from "@/pages/ChineseDictationResultPage";
import { ChineseWrongWordsPage } from "@/pages/ChineseWrongWordsPage";

export default function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<Routes>
					<Route path="/login" element={<LoginPage />} />
					<Route path="/register" element={<RegisterPage />} />
					<Route
						element={
							<ProtectedRoute>
								<AppLayout />
							</ProtectedRoute>
						}
					>
						<Route index element={<DashboardPage />} />
						<Route path="grades" element={<GradeListPage />} />
						<Route
							path="grades/:gid/units/:uid"
							element={<UnitWordsPage />}
						/>
						<Route path="quiz" element={<QuizSetupPage />} />
						<Route
							path="quiz/:mode"
							element={<QuizPlayPage />}
						/>
						<Route
							path="quiz/result"
							element={<QuizResultPage />}
						/>
						<Route
							path="wrong-words"
							element={<WrongWordsPage />}
						/>
						<Route path="stats" element={<StatsPage />} />
						<Route
							path="todo"
							element={
								<div className="flex items-center justify-center py-20">
									<p className="text-muted-foreground">
										TODO — 待开发
									</p>
								</div>
							}
						/>
						<Route
							path="chinese/dictation"
							element={<ChineseDictationSetupPage />}
						/>
						<Route
							path="chinese/dictation/play"
							element={<ChineseDictationPlayPage />}
						/>
						<Route
							path="chinese/dictation/result"
							element={<ChineseDictationResultPage />}
						/>
						<Route
							path="chinese/wrong-words"
							element={<ChineseWrongWordsPage />}
						/>
						<Route path="admin" element={<AdminPage />} />
						<Route
							path="admin/chinese"
							element={<AdminChinesePage />}
						/>
					</Route>
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	);
}
