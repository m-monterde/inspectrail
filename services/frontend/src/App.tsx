import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Journeys } from '@/pages/Journeys';
import { JourneyDetail } from '@/pages/JourneyDetail';
import { Alerts } from '@/pages/Alerts';
import { AlertDetail } from '@/pages/AlertDetail';
import { Systems } from '@/pages/Systems';
import { Thresholds } from '@/pages/Thresholds';
import { useAuthStore } from '@/store/auth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/journeys" element={<Journeys />} />
          <Route path="/journeys/:id" element={<JourneyDetail />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/alerts/:id" element={<AlertDetail />} />
          <Route path="/systems" element={<Systems />} />
          <Route path="/thresholds" element={<Thresholds />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
