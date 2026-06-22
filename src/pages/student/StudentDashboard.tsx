import { useEffect, useState } from 'react'
import { Trophy, Star, BookOpen, CheckCircle, XCircle, Book, Shirt, RefreshCw, Medal } from 'lucide-react'
import StarRating from '../../components/common/StarRating'
import { useAuth } from '../../contexts/AuthContext'
import {
  getStudents, subscribeMemorization, subscribeWeeklyAwards,
  getStudentAttendance, getScheduleNotes, getScheduleConfig, subscribeChallenges,
} from '../../firebase/db'
import type { MemorizationRecord, WeeklyAward, AttendanceRecord, ScheduleNote, ScheduleConfig, Challenge, ChallengeParticipant } from '../../types'
import { MEMORIZATION_LIMITS, MEMORIZATION_LABELS, MEMORIZATION_UNITS, DAY_LABELS } from '../../types'
import { calcSectionBasePoints } from '../../utils/pointsCalculator'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { BookProgress } from '../../components/common/BookProgress'

const DAYS = ['sun', 'mon', 'tue', 'wed'] as const
const DAY_SHORT = ['ح', 'ن', 'ث', 'ر']
const DAY_FULL = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء']

function getChallengeStars(p: ChallengeParticipant): number {
  return [p.sun, p.mon, p.tue, p.wed].filter(Boolean).length * 0.5
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [memorization, setMemorization] = useState<MemorizationRecord | null>(null)
  const [awards, setAwards] = useState<WeeklyAward[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [notes, setNotes] = useState<ScheduleNote[]>([])
  const [config, setConfig] = useState<ScheduleConfig>({ group: 'A', sun: 'فقه', mon: 'فقه', tue: 'نحو', wed: 'نحو' })
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [globalRank, setGlobalRank] = useState<number>(0)
  const [totalStudents, setTotalStudents] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const group = user.group || 'A'

    const loadData = async () => {
      const [allStudents, att, n, c] = await Promise.all([
        getStudents(),
        getStudentAttendance(user.id),
        getScheduleNotes(group),
        getScheduleConfig(group),
      ])

      const rank = allStudents.findIndex(s => s.id === user.id) + 1
      setGlobalRank(rank)
      setTotalStudents(allStudents.length)
      setAttendance(att)
      setNotes(n)
      setConfig(c)
      setLoading(false)
    }

    loadData()

    const unsubMem = subscribeMemorization(user.id, setMemorization)
    const unsubAwards = subscribeWeeklyAwards(setAwards)
    const unsubChallenges = subscribeChallenges(setChallenges)

    return () => { unsubMem(); unsubAwards(); unsubChallenges() }
  }, [user])

  if (loading) return <div className="flex justify-center p-20"><LoadingSpinner size="lg" text="جاري التحميل..." /></div>

  const currentAward = awards[0]
  const lastWeekAward = awards[1]

  const absences = attendance.filter(a => !a.present).length
  const sections = memorization ? Object.keys(MEMORIZATION_LIMITS) as (keyof typeof MEMORIZATION_LIMITS)[] : []

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="gradient-sand rounded-2xl p-5 shadow-md">
        <h2 className="font-amiri text-2xl font-bold text-brown-dark mb-4">أهلاً، {user?.name}</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-parchment/70 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-brown-dark">{memorization ? sections.reduce((sum, k) => sum + calcSectionBasePoints(k, memorization[k].current), 0) + sections.filter(k => memorization[k].bonusAwarded).length * 5 : 0}</p>
            <p className="text-xs text-brown-light">نقاطك</p>
          </div>
          <div className="bg-parchment/70 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-brown-dark">#{globalRank}</p>
            <p className="text-xs text-brown-light">مركزك</p>
          </div>
          <div className="bg-parchment/70 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-brown-dark">{totalStudents}</p>
            <p className="text-xs text-brown-light">إجمالي الطلاب</p>
          </div>
        </div>
      </div>

      {/* Weekly Awards */}
      {currentAward && (
        <div className="card border-2 border-gold-light">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-gold" />
            <h2 className="font-bold text-brown-dark">جوائز هذا الأسبوع</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gold-xlight rounded-xl p-3 text-center border border-gold-light">
              <Star className="h-5 w-5 text-gold mx-auto mb-1" />
              <p className="text-xs text-brown-light">مثالي الأسبوع</p>
              <p className="font-bold text-brown-dark text-sm">{currentAward.idealStudentName}</p>
              {currentAward.idealStudentId === user?.id && <span className="text-xs text-gold-dark font-bold">🎉 أنت!</span>}
            </div>
            <div className="bg-gold-xlight rounded-xl p-3 text-center border border-gold-light">
              <BookOpen className="h-5 w-5 text-gold mx-auto mb-1" />
              <p className="text-xs text-brown-light">حافظ الأسبوع</p>
              <p className="font-bold text-brown-dark text-sm">{currentAward.topMemorizerName}</p>
              {currentAward.topMemorizerId === user?.id && <span className="text-xs text-gold-dark font-bold">🎉 أنت!</span>}
            </div>
          </div>
          {lastWeekAward && (
            <div className="mt-3 pt-3 border-t border-sand-light text-center">
              <p className="text-xs text-brown-light">الأسبوع الماضي: مثالي: <strong>{lastWeekAward.idealStudentName}</strong> | حافظ: <strong>{lastWeekAward.topMemorizerName}</strong></p>
            </div>
          )}
        </div>
      )}

      {/* Memorization Challenges */}
      {(() => {
        const myParts = challenges.flatMap(ch =>
          ch.groups.flatMap(g => {
            const me = g.students.find(s => s.studentId === user?.id)
            if (!me) return []
            const myStars = getChallengeStars(me)
            const rank = g.students.filter(s => getChallengeStars(s) > myStars).length + 1
            const maxStars = Math.max(...g.students.map(getChallengeStars))
            const isFirst = myStars > 0 && myStars === maxStars
            return [{ ch, g, me, myStars, rank, isFirst }]
          })
        )
        if (myParts.length === 0) return null
        return (
          <div className="card border-2 border-sand-light">
            <h2 className="font-bold text-brown-dark mb-4 flex items-center gap-2">
              <Medal className="h-5 w-5 text-gold" /> تحدياتي
            </h2>
            <div className="space-y-4">
              {myParts.map(({ ch, g, me, myStars, rank, isFirst }) => (
                <div key={`${ch.id}_${g.id}`} className={`rounded-2xl p-4 border-2 ${isFirst ? 'border-gold bg-gold-xlight/40' : 'border-sand-light bg-cream'}`}>
                  {/* Challenge + group name */}
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <p className="font-bold text-brown-dark">{ch.name}</p>
                      <p className="text-xs text-brown-light">{g.name}</p>
                    </div>
                    {isFirst
                      ? <span className="flex items-center gap-1 bg-gold text-brown-dark text-xs font-bold px-3 py-1 rounded-full"><Trophy className="h-3.5 w-3.5" /> المركز الأول</span>
                      : <span className="text-xs bg-parchment text-brown border border-sand px-3 py-1 rounded-full font-semibold">المركز #{rank}</span>
                    }
                  </div>

                  {/* Day dots */}
                  <div className="flex items-center gap-2 mb-3">
                    {DAYS.map((k, i) => (
                      <div
                        key={k}
                        title={DAY_FULL[i]}
                        className={`flex-1 py-2 rounded-xl flex flex-col items-center gap-0.5 text-xs font-bold border
                          ${me[k] ? 'bg-gold text-brown-dark border-gold-dark' : 'bg-sand-light text-brown-xlight border-sand'}`}
                      >
                        <span>{DAY_SHORT[i]}</span>
                        {me[k] ? <StarRating stars={0.5} max={1} size={14} /> : <span className="text-brown-xlight text-xs">○</span>}
                      </div>
                    ))}
                  </div>

                  {/* Stars total + group standings */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StarRating stars={myStars} size={22} />
                      <span className="text-sm text-brown-light font-bold">{myStars}/2</span>
                    </div>
                    <div className="text-left">
                      {g.students
                        .slice()
                        .sort((a, b) => getChallengeStars(b) - getChallengeStars(a))
                        .map(s => (
                          <div key={s.studentId} className={`text-xs flex items-center gap-1.5 ${s.studentId === user?.id ? 'font-bold text-brown-dark' : 'text-brown-light'}`}>
                            <span>{s.studentName}</span>
                            <StarRating stars={getChallengeStars(s)} size={14} />
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Attendance summary */}
      <div className="card">
        <h2 className="font-bold text-brown-dark mb-3 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" /> ملخص الحضور
        </h2>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-red-50 rounded-xl p-2 text-center border border-red-200">
            <p className="text-xl font-bold text-red-600">{absences}</p>
            <p className="text-xs text-red-400">غياب</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-2 text-center border border-blue-200">
            <p className="text-xl font-bold text-blue-600">
              {attendance.filter(a => a.present && !a.hasBook).length}
            </p>
            <p className="text-xs text-blue-400">بدون كتاب</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-2 text-center border border-purple-200">
            <p className="text-xl font-bold text-purple-600">
              {attendance.filter(a => a.present && !a.hasUniform).length}
            </p>
            <p className="text-xs text-purple-400">بدون زي</p>
          </div>
        </div>
        {attendance.length > 0 && (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {attendance.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center gap-2 text-xs py-1 border-b border-sand-light last:border-0">
                {a.present
                  ? <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  : <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                }
                <span className="text-brown-light">{a.date instanceof Date ? a.date.toLocaleDateString('ar-SA') : ''}</span>
                {a.present && (
                  <div className="flex gap-1">
                    <span className={`px-1 rounded ${a.hasBook ? 'text-blue-500' : 'text-red-400'}`}><Book className="h-3 w-3" /></span>
                    <span className={`px-1 rounded ${a.hasUniform ? 'text-purple-500' : 'text-red-400'}`}><Shirt className="h-3 w-3" /></span>
                    <span className={`px-1 rounded ${a.reviewed ? 'text-gold-dark' : 'text-brown-xlight'}`}><RefreshCw className="h-3 w-3" /></span>
                  </div>
                )}
                {a.note && <span className="text-brown-light truncate">{a.note}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Memorization progress - Book visual */}
      {memorization && (
        <div className="card">
          <h2 className="font-bold text-brown-dark mb-5 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-gold" /> تقدمي في الحفظ
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {sections.map(key => {
              const sec = memorization[key]
              const pts = calcSectionBasePoints(key, sec.current)
              return (
                <div key={key} className={`rounded-2xl p-3 border-2 transition-all ${
                  sec.completed
                    ? 'border-gold bg-gold-xlight shadow-md'
                    : 'border-sand-light bg-cream'
                }`}>
                  <BookProgress
                    current={sec.current}
                    max={MEMORIZATION_LIMITS[key]}
                    label={MEMORIZATION_LABELS[key]}
                    unit={MEMORIZATION_UNITS[key]}
                    completed={sec.completed}
                    size="md"
                  />
                  {sec.bonusAwarded && (
                    <p className="text-center text-xs text-gold-dark font-bold mt-1">+5 اجتياز ✓</p>
                  )}
                  <p className="text-center text-xs text-brown-xlight mt-0.5">{pts} نقطة</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Schedule */}
      <div className="card">
        <h2 className="font-bold text-brown-dark mb-4">الجدول الأسبوعي</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DAYS.map(day => {
            const dayNotes = notes.filter(n => n.day === day)
            return (
              <div key={day} className="border border-sand-light rounded-xl p-3">
                <div className="bg-sand rounded-lg px-2 py-1.5 mb-2 text-center">
                  <p className="font-bold text-brown-dark text-xs">{DAY_LABELS[day]}</p>
                  <p className="text-xs text-brown">{config[day]}</p>
                </div>
                {dayNotes.length === 0 ? (
                  <p className="text-xs text-brown-xlight text-center py-1">-</p>
                ) : dayNotes.slice(0, 2).map(note => (
                  <p key={note.id} className="text-xs text-brown bg-cream rounded p-1 mb-1">{note.note}</p>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
