import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth, LEVEL_READONLY, LEVEL_CETA, LEVEL_CPSS, LEVEL_FOCALPOINT, LEVEL_DBADMIN } from './context/AuthContext'
import Login from './pages/Login'
import FieldHome from './pages/field/index'
import ClinicHome from './pages/clinic/index'
import SupervisorHome from './pages/supervisor/index'

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />

  if (user.level === LEVEL_FOCALPOINT) {
    return <Navigate to="/field" replace />
  }
  if (user.level === LEVEL_CPSS) {
    return <Navigate to="/clinic" replace />
  }
  // CETA, Admin, and Read Only → supervisor portal
  return <Navigate to="/supervisor" replace />
}


function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RootRedirect />} />
          <Route path="/field/*" element={<RequireAuth><FieldHome /></RequireAuth>} />
          <Route path="/clinic/*" element={<RequireAuth><ClinicHome /></RequireAuth>} />
          <Route path="/supervisor/*" element={<RequireAuth><SupervisorHome /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
