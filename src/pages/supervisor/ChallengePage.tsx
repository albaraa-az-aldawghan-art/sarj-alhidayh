import { useEffect, useState } from 'react'
import { Plus, Trash2, Trophy, Star, ChevronDown, ChevronUp, Medal } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getStudents, subscribeChallenges, addChallenge, updateChallenge, deleteChallenge,
} from '../../firebase/db'
import type { Student, Challenge, ChallengeGroup, ChallengeParticipant } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'

// ── Helpers ────────────────────────────────────────────────────────────────────

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed'] as const
const DAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء']
const DAY_SHORT = ['ح', 'ن', 'ث', 'ر']
const GROUP_ARABIC = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة']

function getStars(p: ChallengeParticipant): number {
  return DAY_KEYS.filter(k => p[k]).length * 0.5
}

function getWinners(group: ChallengeGroup): ChallengeParticipant[] {
  if (!group.students.length) return []
  const max = Math.max(...group.students.map(getStars))
  if (max === 0) return []
  return group.students.filter(s => getStars(s) === max)
}

function StarsDisplay({ stars }: { stars: number }) {
  return (
    <span className="flex items-center gap-0.5 font-bold text-sm">
      {[0, 1].map(i => {
        const rem = stars - i
        if (rem >= 1) return <span key={i} className="text-gold text-base">★</span>
        if (rem >= 0.5) return <span key={i} className="text-gold text-base">½</span>
        return <span key={i} className="text-sand-dark text-base">☆</span>
      })}
      <span className="text-xs text-brown-light mr-0.5">{stars}</span>
    </span>
  )
}

function DayDots({ p, activeDay }: { p: ChallengeParticipant; activeDay?: typeof DAY_KEYS[number] }) {
  return (
    <div className="flex gap-1">
      {DAY_KEYS.map((k, i) => (
        <div
          key={k}
          title={DAY_LABELS[i]}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
            ${p[k] ? 'bg-gold text-brown-dark' : 'bg-sand-light text-brown-xlight border border-sand'}
            ${activeDay === k ? 'ring-2 ring-gold-dark' : ''}`}
        >
          {DAY_SHORT[i]}
        </div>
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChallengePage() {
  const { user } = useAuth()
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [challengeName, setChallengeName] = useState('')
  const [draftGroups, setDraftGroups] = useState<Array<{ name: string; studentIds: string[] }>>([])
  const [saving, setSaving] = useState(false)

  // Record day modal
  const [recordTarget, setRecordTarget] = useState<Challenge | null>(null)
  const [recordDay, setRecordDay] = useState<typeof DAY_KEYS[number]>('sun')
  const [checks, setChecks] = useState<Record<string, boolean>>({})

  useEffect(() => {
    getStudents().then(setAllStudents)
    return subscribeChallenges(ch => { setChallenges(ch); setLoading(false) })
  }, [])

  // ── Create challenge ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setChallengeName('')
    setDraftGroups([{ name: 'المجموعة الأولى', studentIds: [] }])
    setShowCreate(true)
  }

  const addDraftGroup = () => {
    setDraftGroups(gs => [
      ...gs,
      { name: `المجموعة ${GROUP_ARABIC[gs.length] ?? gs.length + 1}`, studentIds: [] },
    ])
  }

  const removeDraftGroup = (i: number) =>
    setDraftGroups(gs => gs.filter((_, idx) => idx !== i))

  const toggleStudent = (gi: number, sid: string) =>
    setDraftGroups(gs => gs.map((g, i) => {
      if (i !== gi) return g
      const has = g.studentIds.includes(sid)
      return { ...g, studentIds: has ? g.studentIds.filter(id => id !== sid) : [...g.studentIds, sid] }
    }))

  const usedIds = new Set(draftGroups.flatMap(g => g.studentIds))

  const handleCreate = async () => {
    if (!challengeName.trim()) return toast.error('يرجى كتابة اسم التحدي')
    if (draftGroups.some(g => g.studentIds.length < 2)) return toast.error('كل مجموعة تحتاج طالبين على الأقل')
    setSaving(true)
    try {
      const groups: ChallengeGroup[] = draftGroups.map((g, idx) => ({
        id: `g${idx + 1}`,
        name: g.name,
        students: g.studentIds.map(sid => {
          const s = allStudents.find(st => st.id === sid)!
          return { studentId: sid, studentName: s.name, sun: false, mon: false, tue: false, wed: false }
        }),
      }))
      await addChallenge({
        name: challengeName.trim(),
        supervisorId: user!.id,
        supervisorName: user!.name,
        groups,
        createdAt: new Date(),
      })
      toast.success('تم إنشاء التحدي')
      setShowCreate(false)
    } catch { toast.error('حدث خطأ') }
    finally { setSaving(false) }
  }

  // ── Record day ───────────────────────────────────────────────────────────────

  const openRecord = (ch: Challenge) => {
    const todayKey = DAY_KEYS[new Date().getDay()] ?? 'sun'
    setRecordDay(todayKey)
    const init: Record<string, boolean> = {}
    ch.groups.forEach(g => g.students.forEach(s => {
      init[`${g.id}_${s.studentId}`] = s[todayKey]
    }))
    setChecks(init)
    setRecordTarget(ch)
  }

  const switchDay = (day: typeof DAY_KEYS[number]) => {
    if (!recordTarget) return
    setRecordDay(day)
    const init: Record<string, boolean> = {}
    recordTarget.groups.forEach(g => g.students.forEach(s => {
      init[`${g.id}_${s.studentId}`] = s[day]
    }))
    setChecks(init)
  }

  const handleSaveRecord = async () => {
    if (!recordTarget) return
    setSaving(true)
    try {
      const updated: ChallengeGroup[] = recordTarget.groups.map(g => ({
        ...g,
        students: g.students.map(s => ({
          ...s,
          [recordDay]: checks[`${g.id}_${s.studentId}`] ?? false,
        })),
      }))
      await updateChallenge(recordTarget.id, { groups: updated })
      toast.success('تم تسجيل اليوم')
      setRecordTarget(null)
    } catch { toast.error('حدث خطأ') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا التحدي؟')) return
    try { await deleteChallenge(id); toast.success('تم الحذف') }
    catch { toast.error('حدث خطأ') }
  }

  if (loading) return <div className="flex justify-center p-20"><LoadingSpinner size="lg" /></div>

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="section-title mb-0">تحديات الحفظ</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" /> إضافة تحدي
        </button>
      </div>

      {challenges.length === 0 ? (
        <div className="card text-center py-14">
          <Medal className="h-14 w-14 text-sand mx-auto mb-3" />
          <p className="text-brown-light text-lg font-semibold mb-1">لا توجد تحديات بعد</p>
          <p className="text-brown-xlight text-sm mb-5">أنشئ تحدياً بين مجموعات الطلاب وتتبّع تقدمهم يومياً</p>
          <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> إنشاء أول تحدي
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map(ch => {
            const expanded = expandedId === ch.id
            const totalParticipants = ch.groups.reduce((s, g) => s + g.students.length, 0)
            return (
              <div key={ch.id} className="card border-2 border-sand-light">
                {/* Card header */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-gold-xlight rounded-xl flex-shrink-0">
                      <Trophy className="h-5 w-5 text-gold" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-brown-dark text-lg truncate">{ch.name}</h2>
                      <p className="text-xs text-brown-light">
                        {ch.groups.length} مجموعات • {totalParticipants} طالب
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openRecord(ch)}
                      className="btn-secondary text-sm flex items-center gap-1.5 py-2"
                    >
                      <Star className="h-4 w-4" /> تسجيل يوم
                    </button>
                    <button
                      onClick={() => setExpandedId(expanded ? null : ch.id)}
                      className="p-2 rounded-xl hover:bg-sand-light transition-colors text-brown border border-sand"
                    >
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(ch.id)}
                      className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Quick winners summary */}
                {!expanded && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ch.groups.map(g => {
                      const ws = getWinners(g)
                      if (!ws.length) return (
                        <span key={g.id} className="text-xs bg-sand-light text-brown-light px-3 py-1.5 rounded-full border border-sand">
                          {g.name}: لا يوجد فائز بعد
                        </span>
                      )
                      return (
                        <span key={g.id} className="text-xs bg-gold-xlight text-gold-dark px-3 py-1.5 rounded-full border border-gold-light font-semibold flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          {g.name}: {ws.map(w => w.studentName).join('، ')} ({getStars(ws[0])}⭐)
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Expanded: full standings per group */}
                {expanded && (
                  <div className="mt-4 space-y-4 border-t border-sand-light pt-4">
                    {ch.groups.map(group => {
                      const winners = getWinners(group)
                      const sorted = [...group.students].sort((a, b) => getStars(b) - getStars(a))
                      return (
                        <div key={group.id} className="bg-cream rounded-2xl p-4 border border-sand-light">
                          {/* Group header */}
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-brown-dark">{group.name}</h3>
                            {winners.length > 0 && (
                              <div className="flex items-center gap-1.5 bg-gold-xlight border border-gold-light rounded-full px-3 py-1">
                                <Trophy className="h-3.5 w-3.5 text-gold" />
                                <span className="text-xs text-gold-dark font-bold">
                                  المركز الأول: {winners.map(w => w.studentName).join('، ')}
                                </span>
                              </div>
                            )}
                          </div>
                          {/* Leaderboard */}
                          <div className="space-y-2">
                            {sorted.map(p => {
                              const stars = getStars(p)
                              const isWinner = winners.some(w => w.studentId === p.studentId)
                              return (
                                <div
                                  key={p.studentId}
                                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors
                                    ${isWinner
                                      ? 'bg-gold-xlight border-gold-light'
                                      : 'bg-parchment border-transparent'}`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isWinner && <Trophy className="h-4 w-4 text-gold flex-shrink-0" />}
                                    <span className={`font-bold truncate ${isWinner ? 'text-brown-dark' : 'text-brown'}`}>
                                      {p.studentName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 flex-shrink-0">
                                    <DayDots p={p} />
                                    <StarsDisplay stars={stars} />
                                  </div>
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

      {/* ── Create Challenge Modal ─────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="إضافة تحدي جديد">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-bold text-brown mb-1.5">اسم التحدي</label>
            <input
              value={challengeName}
              onChange={e => setChallengeName(e.target.value)}
              className="input-field"
              placeholder="مثال: تحدي أسبوع الفتح"
              autoFocus
            />
          </div>

          {draftGroups.map((g, gi) => (
            <div key={gi} className="bg-cream rounded-2xl p-3 border border-sand-light">
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={g.name}
                  onChange={e => setDraftGroups(gs => gs.map((x, i) => i === gi ? { ...x, name: e.target.value } : x))}
                  className="input-field flex-1 py-1.5 text-sm font-bold"
                />
                {draftGroups.length > 1 && (
                  <button onClick={() => removeDraftGroup(gi)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-brown-light mb-2">
                اختر الطلاب المتنافسين في هذه المجموعة ({g.studentIds.length} محدد)
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {allStudents
                  .filter(s => !usedIds.has(s.id) || g.studentIds.includes(s.id))
                  .map(s => (
                    <label key={s.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-sand-light rounded-lg px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={g.studentIds.includes(s.id)}
                        onChange={() => toggleStudent(gi, s.id)}
                        className="rounded w-4 h-4 accent-amber-600"
                      />
                      <span className="text-sm font-semibold text-brown-dark">{s.name}</span>
                      <span className="text-xs text-brown-xlight mr-auto">مجموعة {s.group === 'A' ? 'أ' : 'ب'}</span>
                    </label>
                  ))}
              </div>
            </div>
          ))}

          <button onClick={addDraftGroup} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" /> إضافة مجموعة أخرى
          </button>

          <div className="flex gap-3 pt-1 sticky bottom-0 bg-white py-2">
            <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">
              {saving ? 'جاري الحفظ...' : 'إنشاء التحدي'}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">إلغاء</button>
          </div>
        </div>
      </Modal>

      {/* ── Record Day Modal ───────────────────────────────────────────────── */}
      {recordTarget && (
        <Modal open={true} onClose={() => setRecordTarget(null)} title={`تسجيل يوم — ${recordTarget.name}`}>
          <div className="space-y-4">
            {/* Day selector */}
            <div>
              <p className="text-sm font-bold text-brown mb-2">اليوم الذي سجّله</p>
              <div className="grid grid-cols-4 gap-2">
                {DAY_KEYS.map((day, i) => (
                  <button
                    key={day}
                    onClick={() => switchDay(day)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-colors
                      ${recordDay === day
                        ? 'bg-gold text-brown-dark shadow-md'
                        : 'bg-parchment text-brown border border-sand hover:bg-sand-light'}`}
                  >
                    {DAY_LABELS[i]}
                  </button>
                ))}
              </div>
            </div>

            {/* Groups */}
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {recordTarget.groups.map(group => (
                <div key={group.id} className="bg-cream rounded-2xl p-3 border border-sand-light">
                  <p className="font-bold text-brown-dark text-sm mb-2">{group.name}</p>
                  <div className="space-y-1.5">
                    {group.students.map(s => {
                      const key = `${group.id}_${s.studentId}`
                      const isChecked = checks[key] ?? false
                      return (
                        <label
                          key={s.studentId}
                          className={`flex items-center gap-3 cursor-pointer rounded-xl px-3 py-2.5 border transition-colors
                            ${isChecked ? 'bg-gold-xlight border-gold-light' : 'bg-parchment border-transparent hover:bg-sand-light'}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => setChecks(c => ({ ...c, [key]: e.target.checked }))}
                            className="w-4 h-4 rounded accent-amber-600"
                          />
                          <span className="font-bold text-brown-dark flex-1">{s.studentName}</span>
                          <StarsDisplay stars={getStars({ ...s, [recordDay]: isChecked })} />
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={handleSaveRecord} disabled={saving} className="btn-primary flex-1">
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button onClick={() => setRecordTarget(null)} className="btn-secondary flex-1">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
