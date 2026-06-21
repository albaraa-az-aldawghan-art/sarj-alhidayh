import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, ClipboardList,
  Calendar, Trophy, BarChart3, QrCode, Shield,
  Menu, X, LogOut, ChevronLeft,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Logo from '../common/Logo'

const navItems = [
  { to: '/supervisor', label: 'لوحة التحكم', icon: LayoutDashboard, end: true },
  { to: '/supervisor/students', label: 'الطلاب', icon: GraduationCap },
  { to: '/supervisor/memorization', label: 'الحفظ', icon: BookOpen },
  { to: '/supervisor/attendance', label: 'الحضور والتحضير', icon: ClipboardList },
  { to: '/supervisor/teachers', label: 'المعلمون', icon: Users },
  { to: '/supervisor/supervisors', label: 'المشرفون', icon: Shield },
  { to: '/supervisor/schedule', label: 'الجدول', icon: Calendar },
  { to: '/supervisor/awards', label: 'مثالي الأسبوع', icon: Trophy },
  { to: '/supervisor/rankings', label: 'الترتيب العام', icon: BarChart3 },
  { to: '/supervisor/qrcode', label: 'الباركود', icon: QrCode },
]

export default function SupervisorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-cream pattern-bg flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-brown-dark/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 right-0 z-30 h-full w-64 bg-parchment border-l border-sand shadow-xl
          flex flex-col
          transform transition-transform duration-300 md:translate-x-0 md:static md:shadow-none
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex-shrink-0 p-4 border-b border-sand-light">
          <div className="flex items-center justify-between">
            <Logo size="sm" showText={true} />
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 rounded-lg hover:bg-sand">
              <X className="h-5 w-5 text-brown" />
            </button>
          </div>
          <div className="mt-3 px-2 py-2 bg-gold-xlight rounded-xl border border-gold-light">
            <p className="text-xs text-brown-light">مشرف</p>
            <p className="font-bold text-brown-dark">{user?.name}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex-shrink-0 p-3 border-t border-sand-light">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 font-semibold hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-parchment border-b border-sand-light px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-sand text-brown"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2 text-brown">
            <ChevronLeft className="h-4 w-4" />
            <span className="font-semibold text-brown-dark">{user?.name}</span>
            <span className="text-brown-light text-sm">| مشرف</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
