import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import FamilyOverview from "./pages/FamilyOverview.tsx";
import History from "./pages/History.tsx";
import { AppProvider, useApp } from "./context/AppContext.tsx";

const queryClient = new QueryClient();

const AppRoute = ({ children }: { children: React.ReactNode }) => {
  const { profile, loading } = useApp();
  if (loading) return null;
  if (!profile) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<AppRoute><Dashboard /></AppRoute>} />
            <Route path="/family-overview" element={<AppRoute><FamilyOverview /></AppRoute>} />
            <Route path="/history" element={<AppRoute><History /></AppRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
