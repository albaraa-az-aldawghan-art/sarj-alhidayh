import { useEffect, useState } from 'react'
import { Check, X, BookOpen, Shirt, RefreshCw, Save, CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'
import { getStudents, getAttendanceByDate, saveAttendance, updateAttendanceRecord } from '../../firebase/db'
import type { Student, AttendanceRecord } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'

interface AttendanceState {
  studentId: string
  studentName: string
  present: boolean
  hasBook: boolean
  hasUniform: boolean
  reviewed: boolean
  note: string
  existingId?: string
}

function toInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fromInputValue(val: string): Date {
  const [y, m, d] = val.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDateAr(date: Date): string {
  return date.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export default function AttendancePage() {
  const { user } = useAuth()
  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0)

  const [dateVal, setDateVal] = useState(toInputValue(todayDate))
  const [group, setGroup] = useState<'A' | 'B'>('A')
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<AttendanceState[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const selectedDate = fromInputValue(dateVal)
  const isFuture = selectedDate > todayDate
  const isToday = selectedDate.getTime() === todayDate.getTime()

  const loadData = async () => {
    setLoading(true)
    setLoaded(false)
    try {
      const [allStudents, dayRecs] = await Promise.all([
        getStudents(),
        isFuture ? Promise.resolve([] as AttendanceRecord[]) : getAttendanceByDate(selectedDate, group),
      ])
      const groupStudents = allStudents.filter(s => s.group === group)
      setStudents(groupStudents)
      setAttendance(groupStudents.map(s => {
        const ex = dayRecs.find(r => r.studentId === s.id)
        if (ex) return {
          studentId: s.id, studentName: s.name,
          present: ex.present, hasBook: ex.hasBook,
          hasUniform: ex.hasUniform, reviewed: ex.reviewed,
          note: ex.note || '', existingId: ex.id,
        }
        return { studentId: s.id, studentName: s.name, present: true, hasBook: true, hasUniform: true, reviewed: false, note: '' }
      }))
      setLoaded(true)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [dateVal, group])

  const toggle = (idx: number, field: keyof Pick<AttendanceState, 'present' | 'hasBook' | 'hasUniform' | 'reviewed'>) => {
    setAttendance(a => a.map((rec, i) => i === idx ? { ...rec, [field]: !rec[field] } : rec))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const toCreate = attendance.filter(a => !a.existingId)
      const toUpdate = attendance.filter(a => a.existingId)
      if (toCreate.length > 0) {
        await saveAttendance(toCreate.map(a => ({
          studentId: a.studentId, studentName: a.studentName,
          date: selectedDate, present: a.present,
          hasBook: a.hasBook, hasUniform: a.hasUniform,
          reviewed: a.reviewed, note: a.note,
          teacherId: user!.id, teacherName: user!.name, group,
        })))
      }
      for (const a of toUpdate) {
        await updateAttendanceRecord(a.existingId!, {
          present: a.present, hasBook: a.hasBook,
          hasUniform: a.hasUniform, reviewed: a.reviewed, note: a.note,
        })
      }
      toast.success('تم حفظ الحضور بنجاح')
      await loadData()
    } catch { toast.error('حدث خطأ') }
    finally { setSaving(false) }
  }

  const present = attendance.filter(a => a.present).length
  const absent = attendance.length - present

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="section-title mb-0">الحضور والتحضير</h1>
        {loaded && !isFuture && (
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="h-5 w-5" />
            {saving ? 'جاري الحفظ...' : 'حفظ الحضور'}
          </button>
        )}
      </div>

      {/* Step 1: Date picker */}
      <div className="card border-2 border-gold-light">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-5 w-5 text-gold" />
          <h2 className="font-bold text-brown-dark">اختر التاريخ</h2>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          <input
            type="date"
            value={dateVal}
            max={toInputValue(todayDate)}
            onChange={e => e.target.value && setDateVal(e.target.value)}
            className="input-field flex-1 min-w-0 text-center text-brown-dark font-semibold cursor-pointer"
          />
          {!isToday && (
            <button
              onClick={() => setDateVal(toInputValue(todayDate))}
              className="btn-secondary whitespace-nowrap text-sm px-4"
            >
              اليوم
            </button>
          )}
        </div>

        {/* Selected date display */}
        <p className={`text-sm mt-2 text-center font-semibold ${isToday ? 'text-gold-dark' : 'text-brown'}`}>
          {isToday ? '📅 اليوم — ' : ''}{formatDateAr(selectedDate)}
        </p>

        {isFuture && (
          <div className="mt-3 bg-gray-100 rounded-xl p-3 text-center">
            <p className="text-gray-400 font-semibold text-sm">🔒 لا يمكن تسجيل حضور لتاريخ مستقبلي</p>
          </div>
        )}
      </div>

      {/* Step 2: Group selector */}
      <div className="card">
        <p className="text-sm font-bold text-brown-dark mb-3">اختر المجموعة</p>
        <div className="flex gap-3">
          {(['A', 'B'] as const).map(g => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`flex-1 py-3 rounded-xl font-bold text-lg transition-colors
                ${group === g ? 'bg-gold text-brown-dark shadow-md' : 'bg-parchment text-brown border border-sand hover:bg-sand-light'}`}
            >
              مجموعة {g === 'A' ? 'أ' : 'ب'}
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Attendance */}
      {loading ? (
        <div className="flex justify-center p-16"><LoadingSpinner size="lg" /></div>
      ) : isFuture ? null : !loaded ? null : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card bg-green-50 border border-green-200">
              <p className="text-2xl font-bold text-green-700">{present}</p>
              <p className="text-xs text-green-600">حاضر</p>
            </div>
            <div className="stat-card bg-red-50 border border-red-200">
              <p className="text-2xl font-bold text-red-700">{absent}</p>
              <p className="text-xs text-red-600">غائب</p>
            </div>
            <div className="stat-card">
              <p className="text-2xl font-bold text-brown-dark">{students.length}</p>
              <p className="text-xs text-brown-light">إجمالي</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setAttendance(a => a.map(r => ({ ...r, present: true })))}
              className="btn-secondary flex-1 text-sm"
            >تحضير الكل</button>
            <button
              onClick={() => setAttendance(a => a.map(r => ({ ...r, present: false })))}
              className="btn-secondary flex-1 text-sm"
            >تغييب الكل</button>
          </div>

          {/* Student list */}
          {attendance.length === 0 ? (
            <div className="card text-center py-8 text-brown-light">لا يوجد طلاب في هذه المجموعة</div>
          ) : (
            <div className="space-y-3">
              {attendance.map((a, idx) => (
                <div key={a.studentId} className={`card border-2 transition-colors ${a.present ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/20'}`}>
                  {/* Name + present/absent toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-brown-dark text-base">{a.studentName}</h3>
                    <button
                      onClick={() => toggle(idx, 'present')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all
                        ${a.present
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-red-100 text-red-700 border border-red-300'}`}
                    >
                      {a.present ? <><Check className="h-4 w-4" /> حاضر</> : <><X className="h-4 w-4" /> غائب</>}
                    </button>
                  </div>

                  {/* Extra fields only if present */}
                  {a.present && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <button
                        onClick={() => toggle(idx, 'hasBook')}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors
                          ${a.hasBook ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-sand-light text-brown-light border border-sand'}`}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        {a.hasBook ? '✓ الكتاب' : '✗ الكتاب'}
                      </button>
                      <button
                        onClick={() => toggle(idx, 'hasUniform')}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors
                          ${a.hasUniform ? 'bg-purple-100 text-purple-700 border border-purple-300' : 'bg-sand-light text-brown-light border border-sand'}`}
                      >
                        <Shirt className="h-3.5 w-3.5" />
                        {a.hasUniform ? '✓ الزي' : '✗ الزي'}
                      </button>
                      <button
                        onClick={() => toggle(idx, 'reviewed')}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors
                          ${a.reviewed ? 'bg-gold-light/60 text-gold-dark border border-gold-light' : 'bg-sand-light text-brown-light border border-sand'}`}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {a.reviewed ? '✓ مراجعة' : '✗ مراجعة'}
                      </button>
                    </div>
                  )}

                  <input
                    value={a.note}
                    onChange={e => {
                      const note = e.target.value
                      setAttendance(prev => prev.map((rec, i) => i === idx ? { ...rec, note } : rec))
                    }}
                    placeholder="ملاحظة (اختياري)..."
                    className="input-field text-sm py-2"
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
