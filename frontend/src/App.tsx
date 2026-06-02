import { type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import MainLayout from './components/MainLayout'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Transactions from './pages/Transactions'
import Reports from './pages/Reports'
import Login from './pages/Login'
import LandingPage from './pages/LandingPage'
import PublicConsulta from './pages/PublicConsulta'

// Rota protegida — redireciona para / (landing) se não autenticado
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/" replace />
}

// Rota de login — redireciona para /app se já autenticado
function GuestRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user ? <Navigate to="/app" replace /> : <>{children}</>
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
          {/* ── Rotas públicas ── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/consulta" element={<PublicConsulta />} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />

          {/* ── Painel administrativo (protegido) ── */}
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>

          {/* Qualquer rota desconhecida volta para a landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
