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
import { AdminPage } from "@/pages/AdminPage";

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
						<Route path="admin" element={<AdminPage />} />
					</Route>
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	);
}
