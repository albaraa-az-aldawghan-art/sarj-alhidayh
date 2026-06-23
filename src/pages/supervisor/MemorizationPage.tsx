import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowRight, CheckCircle, Circle, Plus, Minus, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import { getStudents, subscribeMemorization, updateMemorizationSection, toggleSectionCompleted, updateStudentDailyPoints } from '../../firebase/db'
import type { Student, MemorizationRecord } from '../../types'
import { MEMORIZATION_LIMITS, MEMORIZATION_LABELS, MEMORIZATION_UNITS } from '../../types'
import { calcSectionBasePoints, getProgressPercent } from '../../utils/pointsCalculator'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ProgressBar from '../../components/common/ProgressBar'
import { BookProgress } from '../../components/common/BookProgress'

type SectionKey = keyof typeof MEMORIZATION_LIMITS

export default function MemorizationPage() {
  const { studentId } = useParams<{ studentId?: string }>()
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [selectedId, setSelectedId] = useState(studentId || '')
  const [memorization, setMemorization] = useState<MemorizationRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [dailyInput, setDailyInput] = useState(0)
  const [savingDaily, setSavingDaily] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    getStudents().then(s => {
      setStudents(s)
      if (!selectedId && s.length > 0) setSelectedId(s[0].id)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!selectedId) return
    const unsub = subscribeMemorization(selectedId, mem => {
      setMemorization(mem)
      if (mem) {
        const vals: Record<string, string> = {}
        for (const key of Object.keys(MEMORIZATION_LIMITS)) {
          const k = key as SectionKey
          vals[k] = String(mem[k]?.current ?? 0)
        }
        setInputValues(vals)
      }
    })
    return () => unsub()
  }, [selectedId])

  const handleUpdate = async (key: SectionKey) => {
    const val = parseInt(inputValues[key] || '0', 10)
    const max = MEMORIZATION_LIMITS[key]
    if (isNaN(val) || val < 0 || val > max) {
      toast.error(`القيمة يجب أن تكون بين 0 و ${max}`)
      return
    }
    setSaving(key)
    try {
      await updateMemorizationSection(selectedId, key, val, user!.id)
      toast.success('تم الحفظ')
    } catch {
      toast.error('حدث خطأ')
    } finally {
      setSaving(null)
    }
  }

  const handleToggleComplete = async (key: SectionKey, completed: boolean) => {
    if (!memorization) return
    const current = memorization[key].current
    const max = MEMORIZATION_LIMITS[key]
    if (completed && current < max) {
      if (!confirm('الطالب لم يكمل هذا الجزء بعد. هل تريد تسجيل الاجتياز؟')) return
    }
    setSaving(key + '_complete')
    try {
      await toggleSectionCompleted(selectedId, key, completed, user!.id)
      toast.success(completed ? 'تم تسجيل اجتياز الاختبار (+5 نقاط)' : 'تم إلغاء الاجتياز')
    } catch {
      toast.error('حدث خطأ')
    } finally {
      setSaving(null)
    }
  }

  const adjust = (key: SectionKey, delta: number) => {
    const cur = parseInt(inputValues[key] || '0', 10)
    const max = MEMORIZATION_LIMITS[key]
    const next = Math.max(0, Math.min(max, (isNaN(cur) ? 0 : cur) + delta))
    setInputValues(v => ({ ...v, [key]: String(next) }))
  }

  const selectedStudent = students.find(s => s.id === selectedId)

  // Load daily points when student changes — reset to 0 if date is not today
  useEffect(() => {
    if (!selectedStudent) return
    const pts = selectedStudent.dailyPointsDate === today ? (selectedStudent.dailyPoints ?? 0) : 0
    setDailyInput(pts)
  }, [selectedId, students])

  const handleSaveDaily = async () => {
    if (!selectedId) return
    setSavingDaily(true)
    try {
      await updateStudentDailyPoints(selectedId, dailyInput)
      setStudents(prev => prev.map(s => s.id === selectedId
        ? { ...s, dailyPoints: dailyInput, dailyPointsDate: today }
        : s
      ))
      toast.success('تم حفظ نقاط اليوم')
    } catch { toast.error('حدث خطأ') }
    finally { setSavingDaily(false) }
  }

  if (loading) return <div className="flex justify-center p-20"><LoadingSpinner size="lg" text="جاري التحميل..." /></div>

  const sections = Object.keys(MEMORIZATION_LIMITS) as SectionKey[]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/supervisor/students" className="p-2 rounded-xl hover:bg-sand-light transition-colors">
          <ArrowRight className="h-5 w-5 text-brown" />
        </Link>
        <h1 className="section-title mb-0">سجل الحفظ</h1>
      </div>

      {/* Student selector */}
      <div className="card">
        <label className="block text-sm font-semibold text-brown mb-2">اختر الطالب</label>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="input-field"
        >
          {students.map(s => (
            <option key={s.id} value={s.id}>{s.name} - {s.code}</option>
          ))}
        </select>
        {selectedStudent && (
          <div className="mt-3 flex items-center justify-between bg-gold-xlight rounded-xl p-3 border border-gold-light">
            <div>
              <p className="font-bold text-brown-dark">{selectedStudent.name}</p>
              <p className="text-xs text-brown-light">مجموعة {selectedStudent.group === 'A' ? 'أ' : 'ب'} | كود: {selectedStudent.code}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-brown-dark">{selectedStudent.totalPoints}</p>
              <p className="text-xs text-brown-light">نقطة</p>
            </div>
          </div>
        )}
      </div>

      {/* Daily points */}
      {selectedStudent && (
        <div className="card border-2 border-gold-light bg-gold-xlight/30">
          <div className="flex items-center gap-2 mb-3">
            <Sun className="h-5 w-5 text-gold" />
            <h2 className="font-bold text-brown-dark">نقاط اليوم</h2>
            <span className="mr-auto text-xs text-brown-xlight">
              {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDailyInput(v => Math.max(0, v - 1))}
              className="p-2.5 rounded-xl bg-white border border-sand hover:bg-sand-light text-brown transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              min={0}
              value={dailyInput === 0 ? '' : dailyInput}
              placeholder="0"
              onChange={e => setDailyInput(Math.max(0, Number(e.target.value) || 0))}
              className="input-field text-center font-bold text-2xl w-28 flex-shrink-0"
            />
            <button
              onClick={() => setDailyInput(v => v + 1)}
              className="p-2.5 rounded-xl bg-white border border-sand hover:bg-sand-light text-brown transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={handleSaveDaily}
              disabled={savingDaily}
              className="btn-primary flex-1 text-sm"
            >
              {savingDaily ? 'جاري الحفظ...' : 'حفظ نقاط اليوم'}
            </button>
          </div>
          <p className="text-xs text-brown-xlight mt-2 text-center">تُصفَّر تلقائياً في اليوم التالي</p>
        </div>
      )}

      {/* Visual book progress overview */}
      {memorization && (
        <div className="card">
          <h2 className="font-bold text-brown-dark mb-4 flex items-center gap-2">
            نظرة عامة على تقدم الحفظ
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {sections.map(key => (
              <div key={key} className={`rounded-2xl p-2 border-2 transition-all ${
                memorization[key].completed
                  ? 'border-gold bg-gold-xlight shadow'
                  : 'border-sand-light bg-cream'
              }`}>
                <BookProgress
                  current={memorization[key].current}
                  max={MEMORIZATION_LIMITS[key]}
                  label={MEMORIZATION_LABELS[key]}
                  unit={MEMORIZATION_UNITS[key]}
                  completed={memorization[key].completed}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memorization sections */}
      {!memorization ? (
        <div className="flex justify-center p-10"><LoadingSpinner size="md" text="جاري تحميل بيانات الحفظ..." /></div>
      ) : (
        <div className="space-y-4">
          {sections.map(key => {
            const sec = memorization[key]
            const max = MEMORIZATION_LIMITS[key]
            const unit = MEMORIZATION_UNITS[key]
            const label = MEMORIZATION_LABELS[key]
            const pts = calcSectionBasePoints(key, sec.current)
            const pct = getProgressPercent(key, sec.current)
            const isSaving = saving === key || saving === key + '_complete'

            return (
              <div key={key} className={`card border-2 ${sec.completed ? 'border-gold' : 'border-transparent'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-brown-dark text-lg">{label}</h3>
                    <p className="text-xs text-brown-light">{sec.current}/{max} {unit} • {pts} نقطة أساسية</p>
                  </div>
                  <button
                    onClick={() => handleToggleComplete(key, !sec.completed)}
                    disabled={!!saving}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      sec.completed
                        ? 'bg-gold text-brown-dark hover:bg-gold-dark'
                        : 'bg-sand-light text-brown hover:bg-sand'
                    }`}
                  >
                    {sec.completed ? (
                      <><CheckCircle className="h-4 w-4" /> تم الاختبار (+5)</>
                    ) : (
                      <><Circle className="h-4 w-4" /> لم يختبر بعد</>
                    )}
                  </button>
                </div>

                <ProgressBar value={sec.current} max={max} showPercent={true} />

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => adjust(key, -1)}
                    className="p-2 rounded-xl bg-sand-light hover:bg-sand text-brown transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max={max}
                    value={inputValues[key] ?? sec.current}
                    onChange={e => setInputValues(v => ({ ...v, [key]: e.target.value }))}
                    className="input-field text-center font-bold text-lg w-24 flex-shrink-0"
                  />
                  <button
                    onClick={() => adjust(key, 1)}
                    className="p-2 rounded-xl bg-sand-light hover:bg-sand text-brown transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleUpdate(key)}
                    disabled={isSaving}
                    className="btn-primary flex-1 text-sm"
                  >
                    {isSaving ? 'جاري الحفظ...' : 'تحديث'}
                  </button>
                </div>

                {sec.completed && sec.bonusAwarded && (
                  <div className="mt-2 text-xs text-gold-dark font-semibold flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> تمت المكافأة: +5 نقاط
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
