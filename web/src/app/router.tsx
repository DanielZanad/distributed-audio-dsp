import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/features/auth/auth-context'
import { AppLayout } from '@/layouts/app-layout'
import { PublicLayout } from '@/layouts/public-layout'
import { LoginPage } from '@/pages/login-page'
import { LibraryPage } from '@/pages/library-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { ProcessPage } from '@/pages/process-page'
import { RegisterPage } from '@/pages/register-page'

function HomeRedirect() {
  const { isAuthenticated } = useAuth()
  return <Navigate to={isAuthenticated ? '/app/process' : '/login'} replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppLayout />}>
          <Route path="process" element={<ProcessPage />} />
          <Route path="library" element={<LibraryPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
