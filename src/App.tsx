import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LandingPage } from '@/pages/LandingPage';
import { RespondPage } from '@/pages/respond/RespondPage';
import { ThanksPage } from '@/pages/respond/ThanksPage';
import { LoginPage } from '@/pages/admin/LoginPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { RecipientsPage } from '@/pages/admin/RecipientsPage';
import { QuestionsPage } from '@/pages/admin/QuestionsPage';
import { AssignmentsPage } from '@/pages/admin/AssignmentsPage';
import { ResponsesPage } from '@/pages/admin/ResponsesPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function AdminGuard({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/respond/:token" element={<RespondPage />} />
          <Route path="/respond/:token/thanks" element={<ThanksPage />} />

          {/* Admin */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminGuard><DashboardPage /></AdminGuard>} />
          <Route path="/admin/recipients" element={<AdminGuard><RecipientsPage /></AdminGuard>} />
          <Route path="/admin/questions" element={<AdminGuard><QuestionsPage /></AdminGuard>} />
          <Route path="/admin/assignments" element={<AdminGuard><AssignmentsPage /></AdminGuard>} />
          <Route path="/admin/responses" element={<AdminGuard><ResponsesPage /></AdminGuard>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
