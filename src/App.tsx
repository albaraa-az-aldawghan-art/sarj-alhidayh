import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoadingSpinner from './components/common/LoadingSpinner'

// Pages
import RoleSelectionPage from './pages/RoleSelectionPage'
import LoginPage from './pages/LoginPage'
import PublicStatsPage from './pages/public/PublicStatsPage'

// Layouts
import SupervisorLayout from './components/layout/SupervisorLayout'
import TeacherLayout from './components/layout/TeacherLayout'
import StudentLayout from './components/layout/StudentLayout'

// Supervisor pages
import SupervisorDashboard from './pages/supervisor/DashboardPage'
import StudentsPage from './pages/supervisor/StudentsPage'
import MemorizationPage from './pages/supervisor/MemorizationPage'
import TeachersPage from './pages/supervisor/TeachersPage'
import SupervisorsPage from './pages/supervisor/SupervisorsPage'
import SchedulePage from './pages/supervisor/SchedulePage'
import AwardsPage from './pages/supervisor/AwardsPage'
import RankingsPage from './pages/supervisor/RankingsPage'
import QRCodePage from './pages/supervisor/QRCodePage'

// Teacher pages
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import AttendancePage from './pages/teacher/AttendancePage'
import ScheduleNotesPage from './pages/teacher/ScheduleNotesPage'

// Student pages
import StudentDashboard from './pages/student/StudentDashboard'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <LoadingSpinner size="lg" text="جاري التحميل..." />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/public" element={<PublicStatsPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Root: redirect based on auth state */}
      <Route
        path="/"
        element={
          user
            ? user.role === 'supervisor'
              ? <Navigate to="/supervisor" replace />
              : user.role === 'teacher'
              ? <Navigate to="/teacher" replace />
              : <Navigate to="/student" replace />
            : <RoleSelectionPage />
        }
      />

      {/* Supervisor routes */}
      <Route
        path="/supervisor"
        element={user?.role === 'supervisor' ? <SupervisorLayout /> : <Navigate to="/" replace />}
      >
        <Route index element={<SupervisorDashboard />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="memorization" element={<MemorizationPage />} />
        <Route path="memorization/:studentId" element={<MemorizationPage />} />
        <Route path="teachers" element={<TeachersPage />} />
        <Route path="supervisors" element={<SupervisorsPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="awards" element={<AwardsPage />} />
        <Route path="rankings" element={<RankingsPage />} />
        <Route path="qrcode" element={<QRCodePage />} />
      </Route>

      {/* Teacher routes */}
      <Route
        path="/teacher"
        element={user?.role === 'teacher' ? <TeacherLayout /> : <Navigate to="/" replace />}
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="notes" element={<ScheduleNotesPage />} />
      </Route>

      {/* Student routes */}
      <Route
        path="/student"
        element={user?.role === 'student' ? <StudentLayout /> : <Navigate to="/" replace />}
      >
        <Route index element={<StudentDashboard />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#FDFAF4',
              color: '#3D2B1F',
              border: '1px solid #D4B896',
              fontFamily: 'Cairo, sans-serif',
              direction: 'rtl',
            },
            success: { iconTheme: { primary: '#C9A84C', secondary: '#FDFAF4' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}
