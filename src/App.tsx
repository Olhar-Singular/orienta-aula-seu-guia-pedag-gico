import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import RecuperarSenha from "./pages/RecuperarSenha";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Create from "./pages/Create";
import MyAdaptations from "./pages/MyAdaptations";
import Classes from "./pages/Classes";
import ClassDetail from "./pages/ClassDetail";
import StudentProfile from "./pages/StudentProfile";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Pricing from "./pages/Pricing";
import QuestionBank from "./pages/QuestionBank";
import AdaptWizard from "./pages/AdaptWizard";
import AdaptationHistory from "./pages/AdaptationHistory";
import StudentReport from "./pages/StudentReport";
import ClassReport from "./pages/ClassReport";
import Settings from "./pages/Settings";
import BarrierSimulator from "./pages/BarrierSimulator";
import SharedAdaptation from "./pages/SharedAdaptation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ErrorBoundary fallbackMessage="Ocorreu um erro na aplicação. Tente recarregar a página.">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/recuperar-senha" element={<RecuperarSenha />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* Legacy route redirect */}
              <Route path="/auth" element={<Navigate to="/login" replace />} />
              <Route path="/dashboard" element={<ProtectedRoute><ErrorBoundary><Dashboard /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><ErrorBoundary><Create /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/dashboard/adaptar" element={<ProtectedRoute><ErrorBoundary><AdaptWizard /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/my-adaptations" element={<ProtectedRoute><ErrorBoundary><MyAdaptations /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/dashboard/turmas" element={<ProtectedRoute><ErrorBoundary><Classes /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/dashboard/turmas/:id" element={<ProtectedRoute><ErrorBoundary><ClassDetail /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/dashboard/turmas/:id/aluno/:alunoId" element={<ProtectedRoute><ErrorBoundary><StudentProfile /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/dashboard/turmas/:id/aluno/:alunoId/relatorio" element={<ProtectedRoute><ErrorBoundary><StudentReport /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/dashboard/turmas/:id/relatorio" element={<ProtectedRoute><ErrorBoundary><ClassReport /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/dashboard/historico" element={<ProtectedRoute><ErrorBoundary><AdaptationHistory /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/dashboard/banco-questoes" element={<ProtectedRoute><ErrorBoundary><QuestionBank /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/dashboard/configuracoes" element={<ProtectedRoute><ErrorBoundary><Settings /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/dashboard/simulador" element={<ProtectedRoute><ErrorBoundary><BarrierSimulator /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><ErrorBoundary><Chat /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ErrorBoundary><Profile /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/pricing" element={<ProtectedRoute><ErrorBoundary><Pricing /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/compartilhado/:token" element={<ErrorBoundary><SharedAdaptation /></ErrorBoundary>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
