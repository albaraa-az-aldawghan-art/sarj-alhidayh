import { useEffect, useState } from 'react'
import { Trophy, Star, BookOpen, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { getStudents, subscribeWeeklyAwards, setWeeklyAward } from '../../firebase/db'
import type { Student, WeeklyAward } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { getWeekStart, getWeekEnd, formatDateAr } from '../../utils/dateHelpers'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function AwardsPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [awards, setAwards] = useState<WeeklyAward[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ idealStudentId: '', topMemorizerId: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getStudents().then(s => { setStudents(s); setLoading(false) })
    const unsub = subscribeWeeklyAwards(setAwards)
    return () => unsub()
  }, [])

  const handleSave = async () => {
    if (!form.idealStudentId || !form.topMemorizerId) {
      toast.error('يرجى اختيار الطالبين')
      return
    }
    setSaving(true)
    try {
      const ideal = students.find(s => s.id === form.idealStudentId)!
      const top = students.find(s => s.id === form.topMemorizerId)!
      await setWeeklyAward({
        weekStart: getWeekStart(),
        weekEnd: getWeekEnd(),
        idealStudentId: ideal.id,
        idealStudentName: ideal.name,
        topMemorizerId: top.id,
        topMemorizerName: top.name,
        setBy: user!.id,
      })
      toast.success('تم حفظ جوائز الأسبوع')
    } catch { toast.error('حدث خطأ') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center p-20"><LoadingSpinner size="lg" /></div>

  const currentAward = awards[0]
  const pastAwards = awards.slice(1)

  return (
    <div className="space-y-6">
      <h1 className="section-title">مثالي الأسبوع والحافظ</h1>

      {/* Set this week */}
      <div className="card border-2 border-gold-light">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-gold-xlight rounded-xl"><Trophy className="h-6 w-6 text-gold" /></div>
          <div>
            <h2 className="font-bold text-brown-dark text-lg">تعيين جوائز هذا الأسبوع</h2>
            <p className="text-xs text-brown-light">الأسبوع الحالي</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-brown mb-2 flex items-center gap-1.5">
              <Star className="h-4 w-4 text-gold" /> مثالي الأسبوع
            </label>
            <select value={form.idealStudentId} onChange={e => setForm({ ...form, idealStudentId: e.target.value })} className="input-field">
              <option value="">اختر الطالب...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-brown mb-2 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-gold" /> حافظ الأسبوع
            </label>
            <select value={form.topMemorizerId} onChange={e => setForm({ ...form, topMemorizerId: e.target.value })} className="input-field">
              <option value="">اختر الطالب...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary mt-4 w-full">
          {saving ? 'جاري الحفظ...' : 'حفظ جوائز الأسبوع'}
        </button>
      </div>

      {/* Current week display */}
      {currentAward && (
        <div className="card">
          <h2 className="font-bold text-brown-dark mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" /> جوائز هذا الأسبوع
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-gold-xlight border border-gold-light rounded-2xl p-5 text-center">
              <Star className="h-8 w-8 text-gold mx-auto mb-2" />
              <p className="text-xs text-brown-light mb-1">مثالي الأسبوع</p>
              <p className="font-amiri text-2xl font-bold text-brown-dark">{currentAward.idealStudentName}</p>
            </div>
            <div className="bg-gold-xlight border border-gold-light rounded-2xl p-5 text-center">
              <BookOpen className="h-8 w-8 text-gold mx-auto mb-2" />
              <p className="text-xs text-brown-light mb-1">حافظ الأسبوع</p>
              <p className="font-amiri text-2xl font-bold text-brown-dark">{currentAward.topMemorizerName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Past awards */}
      {pastAwards.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-brown-dark mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-brown-light" /> جوائز الأسابيع السابقة
          </h2>
          <div className="space-y-3">
            {pastAwards.map(award => (
              <div key={award.id} className="p-4 bg-cream rounded-xl border border-sand-light">
                <p className="text-xs text-brown-light mb-2">
                  {award.weekStart instanceof Date ? formatDateAr(award.weekStart) : ''} - {award.weekEnd instanceof Date ? formatDateAr(award.weekEnd) : ''}
                </p>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-gold" />
                    <span className="text-sm text-brown"><span className="text-brown-light">مثالي:</span> <strong>{award.idealStudentName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-gold" />
                    <span className="text-sm text-brown"><span className="text-brown-light">حافظ:</span> <strong>{award.topMemorizerName}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
