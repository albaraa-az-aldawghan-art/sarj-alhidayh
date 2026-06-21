import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Logo from '../common/Logo'

export default function StudentLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cream pattern-bg">
      <header className="bg-parchment border-b border-sand-light px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <Logo size="sm" showText={false} />
        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="text-xs text-brown-light">طالب</p>
            <p className="font-bold text-brown-dark text-sm">{user?.name}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/') }}
            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>
      <main className="p-4 md:p-6 max-w-2xl mx-auto"><Outlet /></main>
    </div>
  )
}
