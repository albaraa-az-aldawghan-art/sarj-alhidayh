import { useEffect, useState } from 'react'
import { Check, X, BookOpen, Shirt, RefreshCw, Save } from 'lucide-react'
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

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء']

function getWeekDays(): Date[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay()) // go back to Sunday
  return [0, 1, 2, 3].map(i => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d
  })
}

function getDefaultDayIndex(today: Date): number {
  const day = today.getDay() // 0=Sun..3=Wed..6=Sat
  return day <= 3 ? day : 3 // if Thu/Fri/Sat → default to Wednesday
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })
}

export default function AttendancePage() {
  const { user } = useAuth()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const weekDays = getWeekDays()

  const [selectedIdx, setSelectedIdx] = useState(() => getDefaultDayIndex(today))
  const [group, setGroup] = useState<'A' | 'B'>('A')
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<AttendanceState[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const selectedDate = weekDays[selectedIdx]
  const isFuture = selectedDate > today

  const loadData = async () => {
    setLoading(true)
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
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [selectedIdx, group])

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
        {!isFuture && (
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="h-5 w-5" />
            {saving ? 'جاري الحفظ...' : 'حفظ الحضور'}
          </button>
        )}
      </div>

      {/* Week day tabs */}
      <div className="grid grid-cols-4 gap-2">
        {weekDays.map((date, idx) => {
          const isToday = date.getTime() === today.getTime()
          const isFutureDay = date > today
          const isSelected = idx === selectedIdx
          return (
            <button
              key={idx}
              onClick={() => { if (!isFutureDay) setSelectedIdx(idx) }}
              disabled={isFutureDay}
              className={`flex flex-col items-center py-3 px-1 rounded-2xl border-2 transition-all font-semibold
                ${isFutureDay
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                  : isSelected
                  ? 'bg-gold text-brown-dark border-gold-dark shadow-md'
                  : isToday
                  ? 'bg-gold-xlight text-brown border-gold-light hover:bg-gold-light/30'
                  : 'bg-parchment text-brown border-sand hover:bg-sand-light'
                }`}
            >
              <span className="text-sm">{DAY_NAMES[idx]}</span>
              <span className={`text-xs mt-0.5 ${isFutureDay ? 'text-gray-300' : isSelected ? 'text-brown' : 'text-brown-light'}`}>
                {fmtDate(date)}
              </span>
              {isToday && !isSelected && (
                <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1" />
              )}
            </button>
          )
        })}
      </div>

      {/* Future day placeholder */}
      {isFuture ? (
        <div className="card border-2 border-gray-200 bg-gray-50 text-center py-14">
          <p className="text-2xl text-gray-300 mb-2">🔒</p>
          <p className="font-bold text-gray-400 text-lg">لم يحن وقت هذا اليوم بعد</p>
          <p className="text-gray-300 text-sm mt-1">
            يمكن التحضير في يوم {DAY_NAMES[selectedIdx]} بتاريخ {fmtDate(selectedDate)}
          </p>
        </div>
      ) : (
        <>
          {/* Group selector */}
          <div className="flex gap-3">
            {(['A', 'B'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={`flex-1 py-2.5 rounded-xl font-bold transition-colors
                  ${group === g ? 'bg-gold text-brown-dark shadow-md' : 'bg-parchment text-brown border border-sand hover:bg-sand-light'}`}
              >
                مجموعة {g === 'A' ? 'أ' : 'ب'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center p-20"><LoadingSpinner size="lg" /></div>
          ) : (
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
                    <div key={a.studentId} className={`card border-2 ${a.present ? 'border-green-200' : 'border-red-200'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-brown-dark">{a.studentName}</h3>
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
        </>
      )}
    </div>
  )
}
