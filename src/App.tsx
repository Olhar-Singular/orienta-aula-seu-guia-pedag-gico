import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Login from "./pages/Login";
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

import QuestionBank from "./pages/QuestionBank";
import AdaptWizard from "./pages/AdaptWizard";
import AdaptationHistory from "./pages/AdaptationHistory";
import StudentReport from "./pages/StudentReport";
import ClassReport from "./pages/ClassReport";
import Settings from "./pages/Settings";
import BarrierSimulator from "./pages/BarrierSimulator";
import SharedAdaptation from "./pages/SharedAdaptation";
import TeacherManagement from "./pages/admin/TeacherManagement";
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
              <Route path="/recuperar-senha" element={<RecuperarSenha />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* Redirect old registration routes to login */}
              <Route path="/cadastro" element={<Navigate to="/login" replace />} />
              <Route path="/auth" element={<Navigate to="/login" replace />} />
              
              {/* Protected routes with shared Layout */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                <Route path="/create" element={<ErrorBoundary><Create /></ErrorBoundary>} />
                <Route path="/dashboard/adaptar" element={<ErrorBoundary><AdaptWizard /></ErrorBoundary>} />
                <Route path="/my-adaptations" element={<ErrorBoundary><MyAdaptations /></ErrorBoundary>} />
                <Route path="/dashboard/turmas" element={<ErrorBoundary><Classes /></ErrorBoundary>} />
                <Route path="/dashboard/turmas/:id" element={<ErrorBoundary><ClassDetail /></ErrorBoundary>} />
                <Route path="/dashboard/turmas/:id/aluno/:alunoId" element={<ErrorBoundary><StudentProfile /></ErrorBoundary>} />
                <Route path="/dashboard/turmas/:id/aluno/:alunoId/relatorio" element={<ErrorBoundary><StudentReport /></ErrorBoundary>} />
                <Route path="/dashboard/turmas/:id/relatorio" element={<ErrorBoundary><ClassReport /></ErrorBoundary>} />
                <Route path="/dashboard/historico" element={<ErrorBoundary><AdaptationHistory /></ErrorBoundary>} />
                <Route path="/dashboard/banco-questoes" element={<ErrorBoundary><QuestionBank /></ErrorBoundary>} />
                <Route path="/dashboard/configuracoes" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
                <Route path="/dashboard/simulador" element={<ErrorBoundary><BarrierSimulator /></ErrorBoundary>} />
                <Route path="/chat" element={<ErrorBoundary><Chat /></ErrorBoundary>} />
                <Route path="/profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
                
                {/* Admin routes */}
                <Route path="/admin/professores" element={<AdminRoute><ErrorBoundary><TeacherManagement /></ErrorBoundary></AdminRoute>} />
              </Route>

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
