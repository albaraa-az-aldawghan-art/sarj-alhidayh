import { useEffect, useState } from 'react'
import { Users, BookOpen, Star, Trophy, FileText, Award, ClipboardCheck, Medal } from 'lucide-react'
import { getPublicStats, subscribeWeeklyAwards, subscribeChallenges } from '../../firebase/db'
import type { WeeklyAward, Challenge, ChallengeParticipant } from '../../types'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Logo from '../../components/common/Logo'

interface Completion {
  studentName: string
  bookName: string
}

interface Stats {
  totalStudents: number
  totalPages: number
  totalVerses: number
  totalHadith: number
  totalCompletedMutoon: number
  todayStudents: number
  totalAttendance: number
  completions: Completion[]
}

function getStars(p: ChallengeParticipant) {
  return [p.sun, p.mon, p.tue, p.wed].filter(Boolean).length * 0.5
}

function ChallengeStars({ stars }: { stars: number }) {
  return (
    <span className="font-bold text-gold">
      {[0, 1].map(i => {
        const r = stars - i
        if (r >= 1) return <span key={i}>★</span>
        if (r >= 0.5) return <span key={i}>½</span>
        return <span key={i} className="text-sand-dark">☆</span>
      })}
      <span className="text-xs text-brown-light mr-1">({stars}/2)</span>
    </span>
  )
}

export default function PublicStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [awards, setAwards] = useState<WeeklyAward[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicStats()
      .then(s => setStats(s))
      .catch(e => console.error('خطأ في الإحصائيات:', e))
      .finally(() => setLoading(false))
    const u1 = subscribeWeeklyAwards(setAwards)
    const u2 = subscribeChallenges(setChallenges)
    return () => { u1(); u2() }
  }, [])

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
        {/* Attendance stats */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-6 bg-gold rounded-full" />
            <h2 className="font-bold text-brown-dark text-lg">إحصائيات الحضور</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card bg-green-50 border border-green-200">
              <Users className="h-6 w-6 text-green-600" />
              <p className="text-3xl font-bold text-green-700">{stats?.todayStudents ?? 0}</p>
              <p className="text-xs text-green-600">حضور اليوم</p>
            </div>
            <div className="stat-card bg-cream border border-gold-light">
              <ClipboardCheck className="h-6 w-6 text-gold" />
              <p className="text-3xl font-bold text-brown-dark">{stats?.totalAttendance ?? 0}</p>
              <p className="text-xs text-brown-light">إجمالي الحضور الكلي</p>
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

        {/* Completed mutoon details */}
        {stats && stats.completions.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-6 bg-gold rounded-full" />
              <h2 className="font-bold text-brown-dark text-lg">المتون المكتملة</h2>
              <span className="mr-auto bg-gold-xlight text-gold-dark text-xs font-bold px-2 py-0.5 rounded-full border border-gold-light">
                {stats.completions.length}
              </span>
            </div>
            <div className="space-y-2">
              {stats.completions.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-cream rounded-xl px-4 py-2.5 border border-sand-light">
                  <span className="font-bold text-brown-dark">{c.studentName}</span>
                  <span className="text-xs bg-gold-xlight text-gold-dark font-semibold px-3 py-1 rounded-full border border-gold-light">
                    {c.bookName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All weekly awards */}
        {awards.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Trophy className="h-5 w-5 text-gold" />
              <h2 className="font-bold text-brown-dark text-lg">جوائز الأسابيع</h2>
            </div>

            {awards.map((award, index) => (
              <div
                key={award.id}
                className={`card border-2 ${index === 0 ? 'border-gold bg-gold-xlight/40' : 'border-sand-light'}`}
              >
                {/* Week label */}
                <div className="flex items-center gap-2 mb-3">
                  {index === 0 && <Star className="h-4 w-4 text-gold flex-shrink-0" />}
                  <h3 className={`font-bold text-lg ${index === 0 ? 'text-gold-dark' : 'text-brown-dark'}`}>
                    {award.weekLabel || `الأسبوع ${index + 1}`}
                  </h3>
                  {index === 0 && (
                    <span className="mr-auto text-xs bg-gold text-brown-dark px-2 py-0.5 rounded-full font-bold">
                      الأحدث
                    </span>
                  )}
                </div>

                {/* Winners */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl p-3 text-center border ${index === 0 ? 'bg-white/60 border-gold-light' : 'bg-cream border-sand-light'}`}>
                    <Star className="h-5 w-5 text-gold mx-auto mb-1" />
                    <p className="text-xs text-brown-light mb-1">مثالي الأسبوع</p>
                    <p className="font-amiri font-bold text-brown-dark text-base leading-tight">
                      {award.idealStudentName}
                    </p>
                  </div>
                  <div className={`rounded-xl p-3 text-center border ${index === 0 ? 'bg-white/60 border-gold-light' : 'bg-cream border-sand-light'}`}>
                    <BookOpen className="h-5 w-5 text-gold mx-auto mb-1" />
                    <p className="text-xs text-brown-light mb-1">حافظ الأسبوع</p>
                    <p className="font-amiri font-bold text-brown-dark text-base leading-tight">
                      {award.topMemorizerName}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Challenge winners */}
        {challenges.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Medal className="h-5 w-5 text-gold" />
              <h2 className="font-bold text-brown-dark text-lg">تحديات الحفظ</h2>
            </div>

            {challenges.map(ch => {
              const hasAnyWinner = ch.groups.some(g => {
                const max = Math.max(...g.students.map(getStars))
                return max > 0
              })
              return (
                <div key={ch.id} className="card border-2 border-sand-light">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="h-4 w-4 text-gold" />
                    <h3 className="font-bold text-brown-dark">{ch.name}</h3>
                  </div>

                  {!hasAnyWinner ? (
                    <p className="text-sm text-brown-light text-center py-2">التحدي جارٍ، لا يوجد فائز حتى الآن</p>
                  ) : (
                    <div className="space-y-3">
                      {ch.groups.map(group => {
                        const maxStars = Math.max(...group.students.map(getStars))
                        const winners = maxStars > 0 ? group.students.filter(s => getStars(s) === maxStars) : []
                        const sorted = [...group.students].sort((a, b) => getStars(b) - getStars(a))
                        return (
                          <div key={group.id} className="bg-cream rounded-xl p-3 border border-sand-light">
                            <p className="text-xs font-bold text-brown-light mb-2">{group.name}</p>
                            <div className="space-y-1.5">
                              {sorted.map(p => {
                                const stars = getStars(p)
                                const isWinner = winners.some(w => w.studentId === p.studentId)
                                return (
                                  <div
                                    key={p.studentId}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg
                                      ${isWinner ? 'bg-gold-xlight border border-gold-light' : 'bg-parchment'}`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      {isWinner && <Trophy className="h-3.5 w-3.5 text-gold" />}
                                      <span className={`font-bold text-sm ${isWinner ? 'text-brown-dark' : 'text-brown'}`}>
                                        {p.studentName}
                                      </span>
                                    </div>
                                    <ChallengeStars stars={stars} />
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
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
