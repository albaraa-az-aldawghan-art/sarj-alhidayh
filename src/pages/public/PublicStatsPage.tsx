import { useEffect, useState } from 'react'
import { Users, BookOpen, Star, Trophy, FileText, Award, Clock } from 'lucide-react'
import { getPublicStats, subscribeWeeklyAwards } from '../../firebase/db'
import type { WeeklyAward } from '../../types'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Logo from '../../components/common/Logo'
import { formatDateAr } from '../../utils/dateHelpers'

interface Stats {
  totalStudents: number
  totalPages: number
  totalVerses: number
  totalHadith: number
  totalCompletedMutoon: number
  todayStudents: number
}

export default function PublicStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [awards, setAwards] = useState<WeeklyAward[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicStats().then(s => { setStats(s); setLoading(false) })
    const unsub = subscribeWeeklyAwards(setAwards)
    return () => unsub()
  }, [])

  const currentAward = awards[0]
  const lastAward = awards[1]

  if (loading) return (
    <div className="min-h-screen bg-cream pattern-bg flex items-center justify-center">
      <LoadingSpinner size="lg" text="جاري التحميل..." />
    </div>
  )

  return (
    <div className="min-h-screen bg-cream pattern-bg">
      {/* Header */}
      <div className="gradient-sand px-6 py-10 text-center">
        <Logo size="lg" showText={true} />
        <p className="mt-3 text-brown-light text-sm">إحصائيات المركز</p>
      </div>

      <div className="max-w-lg mx-auto p-5 space-y-5">
        {/* Today stats */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-6 bg-gold rounded-full" />
            <h2 className="font-bold text-brown-dark text-lg">إحصائيات اليوم</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card bg-cream">
              <Users className="h-6 w-6 text-green-600" />
              <p className="text-3xl font-bold text-brown-dark">{stats?.todayStudents ?? 0}</p>
              <p className="text-xs text-brown-light">طلاب اليوم</p>
            </div>
            <div className="stat-card bg-cream">
              <FileText className="h-6 w-6 text-blue-600" />
              <p className="text-3xl font-bold text-brown-dark">-</p>
              <p className="text-xs text-brown-light">صفحات اليوم</p>
            </div>
          </div>
        </div>

        {/* Total stats */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-6 bg-gold-dark rounded-full" />
            <h2 className="font-bold text-brown-dark text-lg">الإجمالي الكلي</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card bg-cream">
              <Users className="h-6 w-6 text-gold" />
              <p className="text-3xl font-bold text-brown-dark">{stats?.totalStudents ?? 0}</p>
              <p className="text-xs text-brown-light">إجمالي الطلاب</p>
            </div>
            <div className="stat-card bg-cream">
              <BookOpen className="h-6 w-6 text-gold" />
              <p className="text-3xl font-bold text-brown-dark">{stats?.totalPages ?? 0}</p>
              <p className="text-xs text-brown-light">صفحات القرآن المحفوظة</p>
            </div>
            <div className="stat-card bg-cream">
              <FileText className="h-6 w-6 text-gold" />
              <p className="text-3xl font-bold text-brown-dark">{stats?.totalVerses ?? 0}</p>
              <p className="text-xs text-brown-light">أبيات المتون</p>
            </div>
            <div className="stat-card bg-cream">
              <Award className="h-6 w-6 text-gold" />
              <p className="text-3xl font-bold text-brown-dark">{stats?.totalCompletedMutoon ?? 0}</p>
              <p className="text-xs text-brown-light">متون مكتملة</p>
            </div>
          </div>
        </div>

        {/* Current week award */}
        {currentAward && (
          <div className="card border-2 border-gold-light">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-gold" />
              <h2 className="font-bold text-brown-dark">جوائز هذا الأسبوع</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gold-xlight rounded-2xl p-4 text-center border border-gold-light">
                <Star className="h-6 w-6 text-gold mx-auto mb-1" />
                <p className="text-xs text-brown-light mb-1">مثالي الأسبوع</p>
                <p className="font-amiri text-xl font-bold text-brown-dark">{currentAward.idealStudentName}</p>
              </div>
              <div className="bg-gold-xlight rounded-2xl p-4 text-center border border-gold-light">
                <BookOpen className="h-6 w-6 text-gold mx-auto mb-1" />
                <p className="text-xs text-brown-light mb-1">حافظ الأسبوع</p>
                <p className="font-amiri text-xl font-bold text-brown-dark">{currentAward.topMemorizerName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Last week award */}
        {lastAward && (
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-brown-light" />
              <h2 className="font-bold text-brown-dark">جوائز الأسبوع الماضي</h2>
              <span className="text-xs text-brown-light">
                {lastAward.weekStart instanceof Date ? formatDateAr(lastAward.weekStart) : ''}
              </span>
            </div>
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-gold" />
                <span className="text-sm text-brown">مثالي: <strong>{lastAward.idealStudentName}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-gold" />
                <span className="text-sm text-brown">حافظ: <strong>{lastAward.topMemorizerName}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-brown-xlight">سرج الهداية • نظام إدارة نقاط الطلاب</p>
        </div>
      </div>
    </div>
  )
}
