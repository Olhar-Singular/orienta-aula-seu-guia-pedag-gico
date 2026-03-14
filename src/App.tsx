import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
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
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/create" element={<ProtectedRoute><Create /></ProtectedRoute>} />
            <Route path="/my-adaptations" element={<ProtectedRoute><MyAdaptations /></ProtectedRoute>} />
            <Route path="/dashboard/turmas" element={<ProtectedRoute><Classes /></ProtectedRoute>} />
            <Route path="/dashboard/turmas/:id" element={<ProtectedRoute><ClassDetail /></ProtectedRoute>} />
            <Route path="/dashboard/turmas/:id/aluno/:alunoId" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
            <Route path="/dashboard/banco-questoes" element={<ProtectedRoute><QuestionBank /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
