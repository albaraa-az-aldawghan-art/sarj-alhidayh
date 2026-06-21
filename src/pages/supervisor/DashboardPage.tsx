import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, BookOpen, Trophy, Star, TrendingUp, GraduationCap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getStudents, getStudentsBySupervisor, subscribeWeeklyAwards } from '../../firebase/db'
import type { Student, WeeklyAward } from '../../types'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function SupervisorDashboard() {
  const { user } = useAuth()
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [myStudents, setMyStudents] = useState<Student[]>([])
  const [awards, setAwards] = useState<WeeklyAward[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [all, mine] = await Promise.all([
          getStudents(),
          getStudentsBySupervisor(user!.id),
        ])
        setAllStudents(all)
        setMyStudents(mine)
      } catch (e) {
        console.error('خطأ في تحميل البيانات:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
    const unsub = subscribeWeeklyAwards(setAwards)
    return () => unsub()
  }, [user])

  if (loading) return <div className="flex justify-center p-20"><LoadingSpinner size="lg" text="جاري التحميل..." /></div>

  const currentAward = awards[0]
  const myTop3 = myStudents.slice(0, 3)
  const globalTop3 = allStudents.slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-amiri text-3xl font-bold text-brown-dark">أهلاً، {user?.name}</h1>
          <p className="text-brown-light mt-1">لوحة تحكم المشرف</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <GraduationCap className="h-8 w-8 text-gold" />
          <p className="text-3xl font-bold text-brown-dark">{allStudents.length}</p>
          <p className="text-xs text-brown-light">إجمالي الطلاب</p>
        </div>
        <div className="stat-card">
          <Users className="h-8 w-8 text-blue-500" />
          <p className="text-3xl font-bold text-brown-dark">{myStudents.length}</p>
          <p className="text-xs text-brown-light">طلابي</p>
        </div>
        <div className="stat-card">
          <TrendingUp className="h-8 w-8 text-green-500" />
          <p className="text-3xl font-bold text-brown-dark">
            {myStudents.length > 0 ? Math.round(myStudents.reduce((s, st) => s + st.totalPoints, 0) / myStudents.length) : 0}
          </p>
          <p className="text-xs text-brown-light">متوسط نقاط مجموعتي</p>
        </div>
        <div className="stat-card">
          <BookOpen className="h-8 w-8 text-purple-500" />
          <p className="text-3xl font-bold text-brown-dark">
            {myStudents.reduce((s, st) => s + st.totalPoints, 0)}
          </p>
          <p className="text-xs text-brown-light">إجمالي نقاط مجموعتي</p>
        </div>
      </div>

      {/* Weekly Award */}
      {currentAward && (
        <div className="card border-2 border-gold-light">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="h-6 w-6 text-gold" />
            <h2 className="font-bold text-brown-dark text-lg">جوائز هذا الأسبوع</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gold-xlight rounded-xl p-4 text-center border border-gold-light">
              <Star className="h-6 w-6 text-gold mx-auto mb-1" />
              <p className="text-xs text-brown-light mb-1">مثالي الأسبوع</p>
              <p className="font-bold text-brown-dark">{currentAward.idealStudentName}</p>
            </div>
            <div className="bg-gold-xlight rounded-xl p-4 text-center border border-gold-light">
              <BookOpen className="h-6 w-6 text-gold mx-auto mb-1" />
              <p className="text-xs text-brown-light mb-1">حافظ الأسبوع</p>
              <p className="font-bold text-brown-dark">{currentAward.topMemorizerName}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* My students top */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-brown-dark text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-gold" /> طلابي (الأعلى نقاطاً)
            </h2>
            <Link to="/supervisor/students" className="text-xs text-gold-dark hover:underline">عرض الكل</Link>
          </div>
          {myTop3.length === 0 ? (
            <p className="text-center text-brown-light py-4">لا يوجد طلاب بعد</p>
          ) : (
            <div className="space-y-3">
              {myTop3.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-cream rounded-xl">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
                    ${i === 0 ? 'bg-gold text-brown-dark' : i === 1 ? 'bg-sand text-brown-dark' : 'bg-sand-light text-brown'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-brown-dark text-sm">{s.name}</p>
                    <p className="text-xs text-brown-light">مجموعة {s.group === 'A' ? 'أ' : 'ب'}</p>
                  </div>
                  <span className="badge-gold">{s.totalPoints} نقطة</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Global top */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-brown-dark text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-gold" /> الترتيب العام
            </h2>
            <Link to="/supervisor/rankings" className="text-xs text-gold-dark hover:underline">عرض الكل</Link>
          </div>
          {globalTop3.length === 0 ? (
            <p className="text-center text-brown-light py-4">لا يوجد طلاب</p>
          ) : (
            <div className="space-y-3">
              {globalTop3.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-cream rounded-xl">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
                    ${i === 0 ? 'bg-gold text-brown-dark' : i === 1 ? 'bg-sand text-brown-dark' : 'bg-sand-light text-brown'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-brown-dark text-sm">{s.name}</p>
                    <p className="text-xs text-brown-light">مجموعة {s.group === 'A' ? 'أ' : 'ب'}</p>
                  </div>
                  <span className="badge-gold">{s.totalPoints} نقطة</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="font-bold text-brown-dark mb-4">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/supervisor/students" className="btn-secondary text-center text-sm">إضافة طالب</Link>
          <Link to="/supervisor/memorization" className="btn-secondary text-center text-sm">تسجيل الحفظ</Link>
          <Link to="/supervisor/awards" className="btn-secondary text-center text-sm">مثالي الأسبوع</Link>
          <Link to="/supervisor/qrcode" className="btn-secondary text-center text-sm">الباركود</Link>
        </div>
      </div>
    </div>
  )
}
