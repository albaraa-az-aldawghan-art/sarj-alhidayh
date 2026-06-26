import { useEffect, useState } from 'react'
import { Check, X, BookOpen, Shirt, RefreshCw, Save, CalendarDays, BarChart2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getStudents, getAttendanceByDate, saveAttendance, updateAttendanceRecord, getAllAbsences, clearAllAttendance } from '../../firebase/db'
import type { Student, AttendanceRecord } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'

interface AttendanceState {
  studentId: string
  studentName: string
  group: 'A' | 'B'
  present: boolean
  hasBook: boolean
  hasUniform: boolean
  reviewed: boolean
  note: string
  existingId?: string
}

interface AbsenceInfo {
  studentId: string
  studentName: string
  group: 'A' | 'B'
  count: number
  dates: Date[]
}

type AbsenceMap = Map<string, { count: number; dates: Date[] }>

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

function buildAbsenceMap(recs: AttendanceRecord[]): AbsenceMap {
  const map: AbsenceMap = new Map()
  for (const r of recs) {
    const d = r.date instanceof Date ? r.date : new Date(r.date)
    const existing = map.get(r.studentId)
    if (existing) {
      existing.count++
      existing.dates.push(d)
    } else {
      map.set(r.studentId, { count: 1, dates: [d] })
    }
  }
  return map
}

export default function AttendancePage() {
  const { user } = useAuth()
  const isSupervisor = user?.role === 'supervisor'
  const teacherGroup = (user?.group as 'A' | 'B') ?? 'A'

  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0)

  const [view, setView] = useState<'attendance' | 'absences'>('attendance')
  const [dateVal, setDateVal] = useState(toInputValue(todayDate))
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<AttendanceState[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [absenceMap, setAbsenceMap] = useState<AbsenceMap>(new Map())
  const [absenceMapLoaded, setAbsenceMapLoaded] = useState(false)
  const [absenceData, setAbsenceData] = useState<AbsenceInfo[] | null>(null)
  const [absenceLoading, setAbsenceLoading] = useState(false)
  const [resetting, setResetting] = useState(false)

  const selectedDate = fromInputValue(dateVal)
  const isFuture = selectedDate > todayDate
  const isToday = selectedDate.getTime() === todayDate.getTime()

  // Load all absences for supervisors (used on student cards)
  useEffect(() => {
    if (!isSupervisor) return
    getAllAbsences()
      .then(recs => setAbsenceMap(buildAbsenceMap(recs)))
      .catch(e => console.error('absences load error:', e))
      .finally(() => setAbsenceMapLoaded(true))
  }, [isSupervisor])

  const loadData = async () => {
    setLoading(true)
    setLoaded(false)
    try {
      const [allStudents, recA, recB] = await Promise.all([
        getStudents(),
        isFuture ? Promise.resolve([] as AttendanceRecord[]) : getAttendanceByDate(selectedDate, 'A'),
        isSupervisor && !isFuture ? getAttendanceByDate(selectedDate, 'B') : Promise.resolve([] as AttendanceRecord[]),
      ])

      const dayRecs = [...recA, ...recB]
      const filtered = isSupervisor
        ? allStudents
        : allStudents.filter(s => s.group === teacherGroup)

      setStudents(filtered)
      setAttendance(filtered.map(s => {
        const ex = dayRecs.find(r => r.studentId === s.id)
        if (ex) return {
          studentId: s.id, studentName: s.name, group: s.group,
          present: ex.present, hasBook: ex.hasBook,
          hasUniform: ex.hasUniform, reviewed: ex.reviewed,
          note: ex.note || '', existingId: ex.id,
        }
        return {
          studentId: s.id, studentName: s.name, group: s.group,
          present: true, hasBook: true, hasUniform: true, reviewed: false, note: '',
        }
      }))
      setLoaded(true)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [dateVal])

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
          teacherId: user!.id, teacherName: user!.name, group: a.group,
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
      if (isSupervisor) {
        getAllAbsences()
          .then(recs => setAbsenceMap(buildAbsenceMap(recs)))
          .catch(e => console.error('absences refresh error:', e))
          .finally(() => setAbsenceMapLoaded(true))
      }
    } catch { toast.error('حدث خطأ') }
    finally { setSaving(false) }
  }

  const loadAbsences = async () => {
    setAbsenceLoading(true)
    try {
      const recs = await getAllAbsences()
      const map = buildAbsenceMap(recs)
      setAbsenceMap(map)
      const result: AbsenceInfo[] = Array.from(map.entries()).map(([studentId, info]) => {
        const s = students.find(st => st.id === studentId)
        return {
          studentId,
          studentName: s?.name ?? recs.find(r => r.studentId === studentId)?.studentName ?? '—',
          group: s?.group ?? (recs.find(r => r.studentId === studentId)?.group ?? 'A'),
          count: info.count,
          dates: [...info.dates].sort((a, b) => b.getTime() - a.getTime()),
        }
      })
      setAbsenceData(result)
    } catch { toast.error('حدث خطأ في تحميل سجل الغياب') }
    finally { setAbsenceLoading(false) }
  }

  const switchView = (v: 'attendance' | 'absences') => {
    setView(v)
    if (v === 'absences') loadAbsences()
  }

  const handleReset = async () => {
    if (!confirm('هل أنت متأكد من تصفير جميع سجلات الحضور؟ سيتم حذف كل السجلات نهائياً ولا يمكن التراجع عن هذا الإجراء.')) return
    setResetting(true)
    try {
      await clearAllAttendance()
      toast.success('تم تصفير سجلات الحضور بنجاح')
      setAbsenceData([])
      setAbsenceMap(new Map())
      await loadData()
    } catch { toast.error('حدث خطأ') }
    finally { setResetting(false) }
  }

  const present = attendance.filter(a => a.present).length
  const absent = attendance.length - present

  const renderAbsenceInline = (studentId: string) => {
    if (!absenceMapLoaded) return null
    const info = absenceMap.get(studentId)
    const count = info?.count ?? 0
    const sorted = info ? [...info.dates].sort((a, b) => b.getTime() - a.getTime()) : []
    if (count === 0) return (
      <span className="text-xs text-gray-400">لم يغب</span>
    )
    return (
      <div className="mt-0.5">
        <span className="text-xs font-bold text-red-600">
          غاب {count} {count === 1 ? 'مرة' : 'مرات'}
        </span>
        <div className="flex flex-wrap gap-1 mt-1">
          {sorted.map((d, i) => (
            <span key={i} className="text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full">
              {d.toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const renderGroup = (grp: 'A' | 'B') => {
    const grpAttendance = attendance.filter(a => a.group === grp)
    if (grpAttendance.length === 0) return null
    const grpPresent = grpAttendance.filter(a => a.present).length
    const grpAbsent = grpAttendance.length - grpPresent
    return (
      <div key={grp} className="space-y-3">
        <div className="bg-gold-xlight border border-gold-light rounded-xl px-4 py-2 text-center text-sm font-bold text-brown-dark">
          مجموعة {grp === 'A' ? 'أ' : 'ب'} — {grpPresent} حاضر / {grpAbsent} غائب
        </div>
        {grpAttendance.map(a => {
          const idx = attendance.findIndex(r => r.studentId === a.studentId)
          return (
            <div key={a.studentId} className={`card border-2 transition-colors ${a.present ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/20'}`}>
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-brown-dark text-base">{a.studentName}</h3>
                  {renderAbsenceInline(a.studentId)}
                </div>
                <button
                  onClick={() => toggle(idx, 'present')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all flex-shrink-0
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
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="section-title mb-0">الحضور والتحضير</h1>
        {view === 'attendance' && loaded && !isFuture && (
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="h-5 w-5" />
            {saving ? 'جاري الحفظ...' : 'حفظ الحضور'}
          </button>
        )}
      </div>

      {/* View tabs — supervisor only */}
      {isSupervisor && (
        <div className="flex gap-2 p-1 bg-sand-light rounded-2xl">
          <button
            onClick={() => switchView('attendance')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              view === 'attendance' ? 'bg-white text-brown-dark shadow' : 'text-brown-light hover:text-brown'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            تسجيل الحضور
          </button>
          <button
            onClick={() => switchView('absences')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              view === 'absences' ? 'bg-white text-brown-dark shadow' : 'text-brown-light hover:text-brown'
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            سجل الغياب
          </button>
        </div>
      )}

      {/* Absence report tab */}
      {view === 'absences' && (
        <div className="space-y-4">
          {absenceLoading ? (
            <div className="flex justify-center p-12"><LoadingSpinner size="lg" text="جاري تحميل سجل الغياب..." /></div>
          ) : absenceData === null ? null : absenceData.length === 0 ? (
            <div className="card text-center py-8 text-brown-light">لا يوجد غياب مسجل</div>
          ) : (
            <>
              {(['A', 'B'] as const).map(grp => {
                const grpData = absenceData.filter(a => a.group === grp).sort((a, b) => b.count - a.count)
                if (grpData.length === 0) return null
                return (
                  <div key={grp} className="space-y-3">
                    <div className="bg-gold-xlight border border-gold-light rounded-xl px-4 py-2 text-center text-sm font-bold text-brown-dark">
                      مجموعة {grp === 'A' ? 'أ' : 'ب'}
                    </div>
                    {grpData.map(a => (
                      <div key={a.studentId} className="card border-2 border-red-100">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-brown-dark">{a.studentName}</h3>
                          <span className="bg-red-100 text-red-700 font-bold text-sm px-3 py-1 rounded-xl border border-red-200">
                            {a.count} {a.count === 1 ? 'غيابة' : 'غيابات'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {a.dates.map((d, i) => (
                            <span key={i} className="text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-full">
                              {d.toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </>
          )}

          {/* Reset */}
          <div className="pt-2 border-t border-sand">
            <button
              onClick={handleReset}
              disabled={resetting}
              className="w-full py-3 px-4 rounded-xl border-2 border-red-300 bg-red-50 text-red-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {resetting ? 'جاري التصفير...' : 'تصفير إجمالي الحضور الكلي'}
            </button>
            <p className="text-xs text-red-400 text-center mt-1">يحذف جميع سجلات الحضور نهائياً ويصفر الباركود</p>
          </div>
        </div>
      )}

      {/* Daily attendance */}
      {view === 'attendance' && (
        <>
          {/* Date picker */}
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
                <button onClick={() => setDateVal(toInputValue(todayDate))} className="btn-secondary whitespace-nowrap text-sm px-4">
                  اليوم
                </button>
              )}
            </div>
            <p className={`text-sm mt-2 text-center font-semibold ${isToday ? 'text-gold-dark' : 'text-brown'}`}>
              {isToday ? '📅 اليوم — ' : ''}{formatDateAr(selectedDate)}
            </p>
            {isFuture && (
              <div className="mt-3 bg-gray-100 rounded-xl p-3 text-center">
                <p className="text-gray-400 font-semibold text-sm">🔒 لا يمكن تسجيل حضور لتاريخ مستقبلي</p>
              </div>
            )}
          </div>

          {/* Teacher group indicator */}
          {!isSupervisor && (
            <div className="bg-gold-xlight border border-gold-light rounded-xl px-4 py-2 text-center text-sm font-bold text-brown-dark">
              مجموعة {teacherGroup === 'A' ? 'أ' : 'ب'}
            </div>
          )}

          {/* Attendance list */}
          {loading ? (
            <div className="flex justify-center p-16"><LoadingSpinner size="lg" /></div>
          ) : isFuture ? null : !loaded ? null : (
            <>
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

              <div className="flex gap-3">
                <button onClick={() => setAttendance(a => a.map(r => ({ ...r, present: true })))} className="btn-secondary flex-1 text-sm">
                  تحضير الكل
                </button>
                <button onClick={() => setAttendance(a => a.map(r => ({ ...r, present: false })))} className="btn-secondary flex-1 text-sm">
                  تغييب الكل
                </button>
              </div>

              {attendance.length === 0 ? (
                <div className="card text-center py-8 text-brown-light">لا يوجد طلاب</div>
              ) : isSupervisor ? (
                <div className="space-y-6">
                  {renderGroup('A')}
                  {renderGroup('B')}
                </div>
              ) : (
                <div className="space-y-3">
                  {attendance.map((a, idx) => (
                    <div key={a.studentId} className={`card border-2 transition-colors ${a.present ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/20'}`}>
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
