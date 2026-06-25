import { useEffect, useState } from 'react'
import { Plus, Trash2, Trophy, BookOpen, ChevronDown, ChevronUp, Medal, RotateCcw, Clock, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getStudents, subscribeChallenges, addChallenge, updateChallenge, deleteChallenge, resetChallengeWeek,
} from '../../firebase/db'
import type { Student, Challenge, ChallengeGroup, ChallengeParticipant, ChallengeWeek, ChallengeWeekParticipant } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'

// ── Helpers ────────────────────────────────────────────────────────────────────

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed'] as const
const DAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء']
const GROUP_ARABIC = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة']

function getChallengeScore(p: ChallengeParticipant): number {
  return DAY_KEYS.reduce((sum, k) => {
    const v = Number(p[k]) || 0
    return v > 0 ? sum + v + 0.5 : sum
  }, 0)
}

function getWinners(group: ChallengeGroup): ChallengeParticipant[] {
  if (!group.students.length) return []
  const max = Math.max(...group.students.map(getChallengeScore))
  if (max === 0) return []
  return group.students.filter(s => getChallengeScore(s) === max)
}

function getWeekWinners(participants: ChallengeWeekParticipant[]): ChallengeWeekParticipant[] {
  if (!participants.length) return []
  const max = Math.max(...participants.map(p => p.score))
  if (max === 0) return []
  return participants.filter(p => p.score === max)
}

function ScoreDisplay({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-bold text-gold-dark text-sm">{score}</span>
      <span className="text-xs text-brown-light">نقطة</span>
    </span>
  )
}

function DayBadges({ p }: { p: ChallengeParticipant }) {
  return (
    <div className="flex gap-1">
      {DAY_KEYS.map((k, i) => {
        const v = Number(p[k]) || 0
        const short = ['ح', 'ن', 'ث', 'ر'][i]
        return (
          <div
            key={k}
            title={`${DAY_LABELS[i]}: ${v > 0 ? v : 'لم يُسجَّل'}`}
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
              ${v > 0 ? 'bg-gold text-brown-dark' : 'bg-sand-light text-brown-xlight border border-sand'}`}
          >
            {v > 0 ? v : short}
          </div>
        )
      })}
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
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [challengeName, setChallengeName] = useState('')
  const [draftGroups, setDraftGroups] = useState<Array<{ name: string; studentIds: string[] }>>([])
  const [saving, setSaving] = useState(false)

  // Record day modal
  const [recordTarget, setRecordTarget] = useState<Challenge | null>(null)
  const [recordDay, setRecordDay] = useState<typeof DAY_KEYS[number]>('sun')
  const [amounts, setAmounts] = useState<Record<string, number>>({})

  // Reset week modal
  const [resetTarget, setResetTarget] = useState<Challenge | null>(null)
  const [weekLabel, setWeekLabel] = useState('')

  // Edit week modal
  const [editTarget, setEditTarget] = useState<{ ch: Challenge; weekIdx: number } | null>(null)
  const [editWeek, setEditWeek] = useState<ChallengeWeek | null>(null)

  // Edit group students modal
  const [editGroupTarget, setEditGroupTarget] = useState<{ ch: Challenge; groupIdx: number } | null>(null)
  const [editGroupStudentIds, setEditGroupStudentIds] = useState<string[]>([])

  // Add new group to existing challenge
  const [addGroupTarget, setAddGroupTarget] = useState<Challenge | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupStudentIds, setNewGroupStudentIds] = useState<string[]>([])

  useEffect(() => {
    getStudents().then(setAllStudents)
    return subscribeChallenges(ch => { setChallenges(ch); setLoading(false) })
  }, [])

  // ── Create ──────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setChallengeName('')
    setDraftGroups([{ name: 'المجموعة الأولى', studentIds: [] }])
    setShowCreate(true)
  }

  const addDraftGroup = () =>
    setDraftGroups(gs => [
      ...gs,
      { name: `المجموعة ${GROUP_ARABIC[gs.length] ?? gs.length + 1}`, studentIds: [] },
    ])

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
    if (draftGroups.some(g => g.studentIds.length < 2)) return toast.error('كل مجموعة تحتاج طالبين على الأقل')
    setSaving(true)
    try {
      const groups: ChallengeGroup[] = draftGroups.map((g, idx) => ({
        id: `g${idx + 1}_${Date.now()}`,
        name: g.name,
        students: g.studentIds.map(sid => {
          const s = allStudents.find(st => st.id === sid)!
          return { studentId: sid, studentName: s.name, sun: 0, mon: 0, tue: 0, wed: 0 }
        }),
      }))
      // Reuse existing challenge with empty groups instead of creating a new doc
      const existingEmpty = challenges.find(ch => ch.groups.length === 0)
      if (existingEmpty) {
        await updateChallenge(existingEmpty.id, { groups })
      } else {
        const now = new Date()
        const autoName = `تحديات الحفظ — ${now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })}`
        await addChallenge({
          name: autoName,
          supervisorId: user!.id,
          supervisorName: user!.name,
          groups,
          weekHistory: [],
          createdAt: new Date(),
        })
      }
      toast.success('تم بدء الأسبوع الجديد')
      setShowCreate(false)
    } catch { toast.error('حدث خطأ') }
    finally { setSaving(false) }
  }

  // ── Record day ───────────────────────────────────────────────────────────────

  const openRecord = (ch: Challenge) => {
    const todayKey = DAY_KEYS[new Date().getDay() === 0 ? 0 : new Date().getDay() === 1 ? 1 : new Date().getDay() === 2 ? 2 : 3] ?? 'sun'
    setRecordDay(todayKey)
    const init: Record<string, number> = {}
    ch.groups.forEach(g => g.students.forEach(s => {
      init[`${g.id}_${s.studentId}`] = Number(s[todayKey]) || 0
    }))
    setAmounts(init)
    setRecordTarget(ch)
  }

  const switchDay = (day: typeof DAY_KEYS[number]) => {
    if (!recordTarget) return
    setRecordDay(day)
    const init: Record<string, number> = {}
    recordTarget.groups.forEach(g => g.students.forEach(s => {
      init[`${g.id}_${s.studentId}`] = Number(s[day]) || 0
    }))
    setAmounts(init)
  }

  const handleSaveRecord = async () => {
    if (!recordTarget) return
    setSaving(true)
    try {
      const updated: ChallengeGroup[] = recordTarget.groups.map(g => ({
        ...g,
        students: g.students.map(s => ({
          ...s,
          [recordDay]: amounts[`${g.id}_${s.studentId}`] ?? 0,
        })),
      }))
      await updateChallenge(recordTarget.id, { groups: updated })
      toast.success('تم تسجيل اليوم')
      setRecordTarget(null)
    } catch { toast.error('حدث خطأ') }
    finally { setSaving(false) }
  }

  // ── Reset week ────────────────────────────────────────────────────────────────

  const openReset = (ch: Challenge) => {
    const weekNum = (ch.weekHistory?.length ?? 0) + 1
    setWeekLabel(`الأسبوع ${weekNum}`)
    setResetTarget(ch)
  }

  const handleResetWeek = async () => {
    if (!resetTarget || !weekLabel.trim()) return
    setSaving(true)
    try {
      await resetChallengeWeek(resetTarget.id, weekLabel.trim())
      toast.success(`تم حفظ ${weekLabel} وبدء أسبوع جديد`)
      setResetTarget(null)
    } catch { toast.error('حدث خطأ') }
    finally { setSaving(false) }
  }

  // ── Edit group students ────────────────────────────────────────────────────────

  const openEditGroup = (ch: Challenge, groupIdx: number) => {
    setEditGroupStudentIds(ch.groups[groupIdx].students.map(s => s.studentId))
    setEditGroupTarget({ ch, groupIdx })
  }

  const handleSaveEditGroup = async () => {
    if (!editGroupTarget) return
    setSaving(true)
    try {
      const { ch, groupIdx } = editGroupTarget
      const group = ch.groups[groupIdx]
      // keep existing students' data, add new ones, remove deselected
      const updatedStudents = editGroupStudentIds.map(sid => {
        const existing = group.students.find(s => s.studentId === sid)
        if (existing) return existing
        const s = allStudents.find(st => st.id === sid)!
        return { studentId: sid, studentName: s.name, sun: 0, mon: 0, tue: 0, wed: 0 }
      })
      const updatedGroups = ch.groups.map((g, i) =>
        i === groupIdx ? { ...g, students: updatedStudents } : g
      )
      await updateChallenge(ch.id, { groups: updatedGroups })
      toast.success('تم تحديث المجموعة')
      setEditGroupTarget(null)
    } catch { toast.error('حدث خطأ') }
    finally { setSaving(false) }
  }

  // ── Add group to challenge ────────────────────────────────────────────────────

  const openAddGroup = (ch: Challenge) => {
    const nextNum = ch.groups.length + 1
    setNewGroupName(`المجموعة ${GROUP_ARABIC[ch.groups.length] ?? nextNum}`)
    setNewGroupStudentIds([])
    setAddGroupTarget(ch)
  }

  const handleSaveNewGroup = async () => {
    if (!addGroupTarget) return
    if (!newGroupName.trim()) return toast.error('يرجى كتابة اسم المجموعة')
    if (newGroupStudentIds.length < 2) return toast.error('المجموعة تحتاج طالبين على الأقل')
    setSaving(true)
    try {
      const newGroup: ChallengeGroup = {
        id: `g${addGroupTarget.groups.length + 1}_${Date.now()}`,
        name: newGroupName.trim(),
        students: newGroupStudentIds.map(sid => {
          const s = allStudents.find(st => st.id === sid)!
          return { studentId: sid, studentName: s.name, sun: 0, mon: 0, tue: 0, wed: 0 }
        }),
      }
      await updateChallenge(addGroupTarget.id, { groups: [...addGroupTarget.groups, newGroup] })
      toast.success('تم إضافة المجموعة')
      setAddGroupTarget(null)
    } catch { toast.error('حدث خطأ') }
    finally { setSaving(false) }
  }

  // ── Edit week ─────────────────────────────────────────────────────────────────

  const openEditWeek = (ch: Challenge, weekIdx: number) => {
    setEditTarget({ ch, weekIdx })
    setEditWeek(JSON.parse(JSON.stringify(ch.weekHistory[weekIdx])) as ChallengeWeek)
  }

  const handleSaveEditWeek = async () => {
    if (!editTarget || !editWeek) return
    setSaving(true)
    try {
      const newHistory = [...editTarget.ch.weekHistory]
      newHistory[editTarget.weekIdx] = editWeek
      await updateChallenge(editTarget.ch.id, { weekHistory: newHistory })
      toast.success('تم التعديل')
      setEditTarget(null)
      setEditWeek(null)
    } catch { toast.error('حدث خطأ') }
    finally { setSaving(false) }
  }

  const handleDeleteWeek = async (ch: Challenge, weekIdx: number) => {
    if (!confirm('هل تريد حذف هذا الأسبوع من السجل؟')) return
    try {
      const newHistory = ch.weekHistory.filter((_, i) => i !== weekIdx)
      await updateChallenge(ch.id, { weekHistory: newHistory })
      toast.success('تم حذف الأسبوع')
    } catch { toast.error('حدث خطأ') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا التحدي؟')) return
    try { await deleteChallenge(id); toast.success('تم الحذف') }
    catch { toast.error('حدث خطأ') }
  }

  if (loading) return <div className="flex justify-center p-20"><LoadingSpinner size="lg" /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="section-title mb-0">تحديات الحفظ</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" /> أسبوع جديد
        </button>
      </div>

      <div className="bg-gold-xlight border border-gold-light rounded-xl px-4 py-3 text-sm text-brown-dark">
        <strong>الحساب:</strong> نقاط التحدي = كمية المحفوظ + 0.5 مكافأة لكل يوم تسجيل
      </div>

      {challenges.length === 0 ? (
        <div className="card text-center py-14">
          <Medal className="h-14 w-14 text-sand mx-auto mb-3" />
          <p className="text-brown-light text-lg font-semibold mb-1">لا يوجد أسبوع جارٍ بعد</p>
          <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2 mt-4">
            <Plus className="h-4 w-4" /> إنشاء الأسبوع الأول
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map(ch => {
            const expanded = expandedId === ch.id
            const historyExpanded = expandedHistory === ch.id
            const weekHistory = ch.weekHistory ?? []
            return (
              <div key={ch.id} className="card border-2 border-sand-light">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-gold-xlight rounded-xl flex-shrink-0">
                      <Trophy className="h-5 w-5 text-gold" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-brown-dark text-lg truncate">تحديات الحفظ</h2>
                      <p className="text-xs text-brown-light">
                        {ch.groups.length > 0
                          ? `${ch.groups.length} مجموعات • الأسبوع الحالي`
                          : 'مكتمل'}
                        {weekHistory.length > 0 && ` • ${weekHistory.length} أسبوع في السجل`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {ch.groups.length > 0 && (
                      <button onClick={() => openRecord(ch)} className="btn-secondary text-sm flex items-center gap-1.5 py-2">
                        <BookOpen className="h-4 w-4" /> تسجيل يوم
                      </button>
                    )}
                    {ch.groups.length > 0 && (
                      <button
                        onClick={() => openReset(ch)}
                        className="text-sm flex items-center gap-1.5 py-2 px-3 rounded-xl border border-sand bg-parchment text-brown hover:bg-sand-light transition-colors font-semibold"
                      >
                        <RotateCcw className="h-4 w-4" /> إنهاء الأسبوع
                      </button>
                    )}
                    {ch.groups.length > 0 && (
                      <button
                        onClick={async () => {
                          if (!confirm('هل تريد حذف الأسبوع الحالي؟ لن يُحفظ في السجل.')) return
                          await updateChallenge(ch.id, { groups: [] })
                          toast.success('تم حذف الأسبوع الحالي')
                        }}
                        className="p-2 rounded-xl text-red-400 hover:bg-red-50 border border-red-200 transition-colors"
                        title="حذف الأسبوع الحالي"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {ch.groups.length > 0 && (
                      <button
                        onClick={() => setExpandedId(expanded ? null : ch.id)}
                        className="p-2 rounded-xl hover:bg-sand-light transition-colors text-brown border border-sand"
                      >
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick summary */}
                {!expanded && ch.groups.length > 0 && (
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
                          {g.name}: {ws.map(w => w.studentName).join('، ')} ({getChallengeScore(ws[0])} نقطة)
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Current week standings — only when groups exist */}
                {expanded && ch.groups.length > 0 && (
                  <div className="mt-4 space-y-4 border-t border-sand-light pt-4">
                    <p className="text-xs font-bold text-brown-light uppercase tracking-wide">الأسبوع الحالي</p>
                    {ch.groups.map((group, groupIdx) => {
                      const winners = getWinners(group)
                      const sorted = [...group.students].sort((a, b) => getChallengeScore(b) - getChallengeScore(a))
                      return (
                        <div key={group.id} className="bg-cream rounded-2xl p-4 border border-sand-light">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-brown-dark">{group.name}</h3>
                              <button
                                onClick={() => openEditGroup(ch, groupIdx)}
                                className="p-1 rounded-lg text-brown-light hover:bg-sand-light hover:text-brown transition-colors"
                                title="تعديل الطلاب"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {winners.length > 0 && (
                              <div className="flex items-center gap-1.5 bg-gold-xlight border border-gold-light rounded-full px-3 py-1">
                                <Trophy className="h-3.5 w-3.5 text-gold" />
                                <span className="text-xs text-gold-dark font-bold">الأول: {winners.map(w => w.studentName).join('، ')}</span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            {sorted.map(p => {
                              const score = getChallengeScore(p)
                              const isWinner = winners.some(w => w.studentId === p.studentId)
                              return (
                                <div key={p.studentId} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${isWinner ? 'bg-gold-xlight border-gold-light' : 'bg-parchment border-transparent'}`}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isWinner && <Trophy className="h-4 w-4 text-gold flex-shrink-0" />}
                                    <span className={`font-bold truncate ${isWinner ? 'text-brown-dark' : 'text-brown'}`}>{p.studentName}</span>
                                  </div>
                                  <div className="flex items-center gap-3 flex-shrink-0">
                                    <DayBadges p={p} />
                                    <ScoreDisplay score={score} />
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

                {/* Add group button — only when week is active */}
                {expanded && ch.groups.length > 0 && (
                  <div className="mt-2 border-t border-sand-light pt-3">
                    <button
                      onClick={() => openAddGroup(ch)}
                      className="w-full py-2.5 rounded-xl border-2 border-dashed border-sand text-brown-light hover:border-gold hover:text-gold-dark transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" /> إضافة مجموعة
                    </button>
                  </div>
                )}

                {/* Week history — always visible when no active groups, collapsible otherwise */}
                {weekHistory.length > 0 && (
                  <div className="mt-3 border-t border-sand-light pt-3">
                    {ch.groups.length > 0 ? (
                      <button
                        onClick={() => setExpandedHistory(historyExpanded ? null : ch.id)}
                        className="flex items-center gap-2 text-sm text-brown-light hover:text-brown font-semibold transition-colors"
                      >
                        <Clock className="h-4 w-4" />
                        سجل الأسابيع ({weekHistory.length})
                        {historyExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-brown-light font-semibold mb-3">
                        <Clock className="h-4 w-4" />
                        سجل الأسابيع ({weekHistory.length})
                      </div>
                    )}
                    {(ch.groups.length === 0 || historyExpanded) && (
                      <div className="mt-3 space-y-3">
                        {weekHistory.map((week, weekIdx) => {
                          const gd = week.groupData ?? []
                          return (
                            <div key={weekIdx} className="bg-cream rounded-xl p-3 border border-sand-light">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-bold text-brown-dark text-sm">{week.weekLabel}</p>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => openEditWeek(ch, weekIdx)} className="p-1.5 rounded-lg text-brown-light hover:bg-sand-light hover:text-brown transition-colors" title="تعديل">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => handleDeleteWeek(ch, weekIdx)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors" title="حذف">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-1">
                                {gd.map(g => {
                                  const winners = getWeekWinners(g.participants)
                                  return (
                                    <div key={g.groupId} className="text-xs">
                                      <span className="text-brown-light">{g.groupName}: </span>
                                      {winners.length === 0
                                        ? <span className="text-brown-xlight">لا يوجد فائز</span>
                                        : winners.map(w => (
                                          <span key={w.studentId} className="inline-flex items-center gap-1 bg-gold-xlight text-gold-dark font-semibold px-2 py-0.5 rounded-full border border-gold-light mr-1">
                                            <Trophy className="h-2.5 w-2.5" /> {w.studentName} ({w.score} نقطة)
                                          </span>
                                        ))}
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
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="أسبوع جديد — إنشاء المجموعات">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-brown-light bg-cream rounded-xl px-3 py-2 border border-sand-light">
            أضف المجموعات والطلاب لبدء الأسبوع الجديد
          </p>
          {draftGroups.map((g, gi) => (
            <div key={gi} className="bg-cream rounded-2xl p-3 border border-sand-light">
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={g.name}
                  onChange={e => setDraftGroups(gs => gs.map((x, i) => i === gi ? { ...x, name: e.target.value } : x))}
                  className="input-field flex-1 py-1.5 text-sm font-bold"
                />
                {draftGroups.length > 1 && (
                  <button onClick={() => removeDraftGroup(gi)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
              <p className="text-xs text-brown-light mb-2">اختر الطلاب ({g.studentIds.length} محدد)</p>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {allStudents.filter(s => !usedIds.has(s.id) || g.studentIds.includes(s.id)).map(s => (
                  <label key={s.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-sand-light rounded-lg px-2 py-1.5">
                    <input type="checkbox" checked={g.studentIds.includes(s.id)} onChange={() => toggleStudent(gi, s.id)} className="rounded w-4 h-4 accent-amber-600" />
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
            <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">{saving ? 'جاري الحفظ...' : 'بدء الأسبوع'}</button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">إلغاء</button>
          </div>
        </div>
      </Modal>

      {/* Record Day Modal */}
      {recordTarget && (
        <Modal open={true} onClose={() => setRecordTarget(null)} title={`تسجيل يوم — ${recordTarget.name}`}>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-brown mb-2">اليوم</p>
              <div className="grid grid-cols-4 gap-2">
                {DAY_KEYS.map((day, i) => (
                  <button key={day} onClick={() => switchDay(day)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${recordDay === day ? 'bg-gold text-brown-dark shadow-md' : 'bg-parchment text-brown border border-sand hover:bg-sand-light'}`}>
                    {DAY_LABELS[i]}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-brown-light bg-gold-xlight border border-gold-light rounded-lg px-3 py-2">
              أدخل كمية ما حفظه كل طالب. النقطة = الكمية + 0.5 مكافأة
            </p>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {recordTarget.groups.map(group => (
                <div key={group.id} className="bg-cream rounded-2xl p-3 border border-sand-light">
                  <p className="font-bold text-brown-dark text-sm mb-3">{group.name}</p>
                  <div className="space-y-2">
                    {group.students.map(s => {
                      const key = `${group.id}_${s.studentId}`
                      const val = amounts[key] ?? 0
                      return (
                        <div key={s.studentId} className="flex items-center gap-3">
                          <span className="flex-1 font-bold text-brown-dark text-sm">{s.studentName}</span>
                          <input
                            type="number" min={0} step={1}
                            value={val === 0 ? '' : val} placeholder="0"
                            onChange={e => { const n = Math.max(0, Number(e.target.value) || 0); setAmounts(a => ({ ...a, [key]: n })) }}
                            className="input-field w-20 text-center py-1.5 text-sm"
                          />
                          {val > 0 && <span className="text-xs text-gold-dark font-bold w-16 text-center">= {val + 0.5} نقطة</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaveRecord} disabled={saving} className="btn-primary flex-1">{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
              <button onClick={() => setRecordTarget(null)} className="btn-secondary flex-1">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add New Group Modal */}
      {addGroupTarget && (
        <Modal open={true} onClose={() => setAddGroupTarget(null)} title={`إضافة مجموعة — ${addGroupTarget.name}`}>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-bold text-brown mb-1.5">اسم المجموعة</label>
              <input
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                className="input-field"
                placeholder="مثال: المجموعة الثانية"
                autoFocus
              />
            </div>
            <div>
              <p className="text-sm font-bold text-brown mb-2">اختر الطلاب ({newGroupStudentIds.length} محدد)</p>
              {(() => {
                const usedInOtherGroups = new Set(
                  addGroupTarget.groups.flatMap(g => g.students.map(s => s.studentId))
                )
                const available = allStudents.filter(s => !usedInOtherGroups.has(s.id))
                if (available.length === 0)
                  return <p className="text-xs text-brown-xlight text-center py-4">جميع الطلاب موزّعون على المجموعات الأخرى</p>
                return available.map(s => (
                  <label key={s.id} className={`flex items-center gap-3 cursor-pointer rounded-xl px-3 py-2.5 border mb-1.5 transition-colors
                    ${newGroupStudentIds.includes(s.id) ? 'bg-gold-xlight border-gold-light' : 'bg-cream border-sand-light hover:bg-sand-light'}`}>
                    <input
                      type="checkbox"
                      checked={newGroupStudentIds.includes(s.id)}
                      onChange={() => setNewGroupStudentIds(ids =>
                        ids.includes(s.id) ? ids.filter(id => id !== s.id) : [...ids, s.id]
                      )}
                      className="w-4 h-4 rounded accent-amber-600"
                    />
                    <span className="font-bold text-brown-dark flex-1">{s.name}</span>
                    <span className="text-xs text-brown-xlight">مجموعة {s.group === 'A' ? 'أ' : 'ب'}</span>
                  </label>
                ))
              })()}
            </div>
            <div className="flex gap-3 pt-1 sticky bottom-0 bg-white py-2">
              <button onClick={handleSaveNewGroup} disabled={saving || newGroupStudentIds.length < 2} className="btn-primary flex-1">
                {saving ? 'جاري الحفظ...' : `إضافة المجموعة (${newGroupStudentIds.length} طلاب)`}
              </button>
              <button onClick={() => setAddGroupTarget(null)} className="btn-secondary flex-1">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Group Students Modal */}
      {editGroupTarget && (
        <Modal open={true} onClose={() => setEditGroupTarget(null)} title={`تعديل طلاب — ${editGroupTarget.ch.groups[editGroupTarget.groupIdx].name}`}>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto">
            <p className="text-xs text-brown-light">اختر الطلاب المشاركين في هذه المجموعة</p>
            {(() => {
              const otherGroupIds = new Set(
                editGroupTarget.ch.groups
                  .filter((_, i) => i !== editGroupTarget.groupIdx)
                  .flatMap(g => g.students.map(s => s.studentId))
              )
              return allStudents
                .filter(s => !otherGroupIds.has(s.id) || editGroupStudentIds.includes(s.id))
                .map(s => (
                  <label key={s.id} className={`flex items-center gap-3 cursor-pointer rounded-xl px-3 py-2.5 border transition-colors
                    ${editGroupStudentIds.includes(s.id) ? 'bg-gold-xlight border-gold-light' : 'bg-cream border-sand-light hover:bg-sand-light'}`}>
                    <input
                      type="checkbox"
                      checked={editGroupStudentIds.includes(s.id)}
                      onChange={() => setEditGroupStudentIds(ids =>
                        ids.includes(s.id) ? ids.filter(id => id !== s.id) : [...ids, s.id]
                      )}
                      className="w-4 h-4 rounded accent-amber-600"
                    />
                    <span className="font-bold text-brown-dark flex-1">{s.name}</span>
                    <span className="text-xs text-brown-xlight">مجموعة {s.group === 'A' ? 'أ' : 'ب'}</span>
                  </label>
                ))
            })()}
            <div className="flex gap-3 pt-2 sticky bottom-0 bg-white py-2">
              <button onClick={handleSaveEditGroup} disabled={saving || editGroupStudentIds.length < 2} className="btn-primary flex-1">
                {saving ? 'جاري الحفظ...' : `حفظ (${editGroupStudentIds.length} طلاب)`}
              </button>
              <button onClick={() => setEditGroupTarget(null)} className="btn-secondary flex-1">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Week Modal */}
      {editTarget && editWeek && (
        <Modal open={true} onClose={() => { setEditTarget(null); setEditWeek(null) }} title={`تعديل — ${editWeek.weekLabel}`}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-bold text-brown mb-1.5">اسم الأسبوع</label>
              <input
                value={editWeek.weekLabel}
                onChange={e => setEditWeek(w => w ? { ...w, weekLabel: e.target.value } : w)}
                className="input-field"
              />
            </div>
            {(editWeek.groupData ?? []).map((gd, gi) => {
              const winners = getWeekWinners(gd.participants)
              return (
                <div key={gd.groupId} className="bg-cream rounded-2xl p-3 border border-sand-light">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-brown-dark text-sm">{gd.groupName}</p>
                    {winners.length > 0 && (
                      <span className="text-xs text-gold-dark font-bold flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> {winners.map(w => w.studentName).join('، ')}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {gd.participants.map((p, pi) => {
                      const isWinner = winners.some(w => w.studentId === p.studentId)
                      return (
                        <div key={p.studentId} className={`flex items-center gap-3 p-2 rounded-xl ${isWinner ? 'bg-gold-xlight border border-gold-light' : ''}`}>
                          {isWinner && <Trophy className="h-3.5 w-3.5 text-gold flex-shrink-0" />}
                          <span className={`flex-1 text-sm ${isWinner ? 'font-bold text-brown-dark' : 'font-semibold text-brown'}`}>{p.studentName}</span>
                          <input
                            type="number" min={0} step={0.5}
                            value={p.score === 0 ? '' : p.score}
                            placeholder="0"
                            onChange={e => {
                              const score = Math.max(0, Number(e.target.value) || 0)
                              setEditWeek(prev => {
                                if (!prev) return prev
                                const groupData = prev.groupData.map((g2, gIdx) => {
                                  if (gIdx !== gi) return g2
                                  const participants = g2.participants.map((p2, pIdx) =>
                                    pIdx === pi ? { ...p2, score } : p2
                                  )
                                  return { ...g2, participants }
                                })
                                return { ...prev, groupData }
                              })
                            }}
                            className="input-field w-20 text-center py-1 text-sm"
                          />
                          <span className="text-xs text-brown-light w-10">نقطة</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-brown-light text-center">الفائز يُحدَّد تلقائياً بأعلى نقطة</p>
            <div className="flex gap-3">
              <button onClick={handleSaveEditWeek} disabled={saving} className="btn-primary flex-1">
                {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
              <button onClick={() => { setEditTarget(null); setEditWeek(null) }} className="btn-secondary flex-1">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Week Modal */}
      {resetTarget && (
        <Modal open={true} onClose={() => setResetTarget(null)} title={`إنهاء الأسبوع — ${resetTarget.name}`}>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              سيتم حفظ نتائج الأسبوع الحالي في السجل وحذف المجموعات. لبدء أسبوع جديد أضف مجموعات جديدة.
            </div>
            <div>
              <label className="block text-sm font-bold text-brown mb-1.5">اسم الأسبوع</label>
              <input
                value={weekLabel}
                onChange={e => setWeekLabel(e.target.value)}
                className="input-field"
                placeholder="مثال: الأسبوع الأول"
                autoFocus
              />
            </div>
            {/* Preview winners */}
            <div className="space-y-2">
              {resetTarget.groups.map(g => {
                const ws = getWinners(g)
                return (
                  <div key={g.id} className="flex items-center gap-2 text-sm">
                    <span className="text-brown-light">{g.name}:</span>
                    {ws.length === 0
                      ? <span className="text-brown-xlight">لا يوجد فائز</span>
                      : ws.map(w => (
                        <span key={w.studentId} className="flex items-center gap-1 text-gold-dark font-bold">
                          <Trophy className="h-3.5 w-3.5" /> {w.studentName} ({getChallengeScore(w)} نقطة)
                        </span>
                      ))}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={handleResetWeek} disabled={saving} className="btn-primary flex-1 bg-amber-600 hover:bg-amber-700">
                {saving ? 'جاري الحفظ...' : 'إنهاء الأسبوع وبدء جديد'}
              </button>
              <button onClick={() => setResetTarget(null)} className="btn-secondary flex-1">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
