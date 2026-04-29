import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import Eventos from "./pages/Eventos";
import EventoDetail from "./pages/EventoDetail";
import Equipe from "./pages/Equipe";
import Cardapio from "./pages/Cardapio";
import Caixa from "./pages/Caixa";
import Calendario from "./pages/Calendario";
import Financeiro from "./pages/Financeiro";
import Usuarios from "./pages/Usuarios";
import Propostas from "./pages/Propostas";
import PropostaNova from "./pages/PropostaNova";
import PropostaDetail from "./pages/PropostaDetail";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
          <Route path="/leads/:id" element={<ProtectedRoute><LeadDetail /></ProtectedRoute>} />
          <Route path="/eventos" element={<ProtectedRoute><Eventos /></ProtectedRoute>} />
          <Route path="/eventos/:id" element={<ProtectedRoute><EventoDetail /></ProtectedRoute>} />
          <Route path="/equipe" element={<ProtectedRoute><Equipe /></ProtectedRoute>} />
          <Route path="/cardapio" element={<ProtectedRoute><Cardapio /></ProtectedRoute>} />
          <Route path="/caixa" element={<ProtectedRoute><Caixa /></ProtectedRoute>} />
          <Route path="/calendario" element={<ProtectedRoute><Calendario /></ProtectedRoute>} />
          <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
          <Route path="/propostas" element={<ProtectedRoute><Propostas /></ProtectedRoute>} />
          <Route path="/propostas/nova" element={<ProtectedRoute><PropostaNova /></ProtectedRoute>} />
          <Route path="/propostas/:id" element={<ProtectedRoute><PropostaDetail /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
