import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getScheduleNotes, addScheduleNote, deleteScheduleNote, getScheduleConfig } from '../../firebase/db'
import type { ScheduleNote, ScheduleConfig } from '../../types'
import { DAY_LABELS } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Modal from '../../components/common/Modal'

const DAYS = ['sun', 'mon', 'tue', 'wed'] as const

export default function ScheduleNotesPage() {
  const { user } = useAuth()
  const [group] = useState<'A' | 'B'>((user?.group as 'A' | 'B') ?? 'A')
  const [notes, setNotes] = useState<ScheduleNote[]>([])
  const [config, setConfig] = useState<ScheduleConfig>({ group: 'A', sun: 'فقه', mon: 'فقه', tue: 'نحو', wed: 'نحو' })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ day: 'sun' as typeof DAYS[number], note: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [n, c] = await Promise.all([getScheduleNotes(group), getScheduleConfig(group)])
    setNotes(n)
    setConfig(c)
    setLoading(false)
  }

  useEffect(() => { setLoading(true); load() }, [group])

  const handleAdd = async () => {
    if (!form.note.trim()) { toast.error('يرجى كتابة الملاحظة'); return }
    setSaving(true)
    try {
      await addScheduleNote({
        group,
        day: form.day,
        date: new Date(),
        subject: config[form.day],
        note: form.note.trim(),
        authorId: user!.id,
        authorName: user!.name,
        authorRole: 'teacher',
      })
      toast.success('تمت إضافة الملاحظة')
      setShowModal(false)
      setForm({ day: 'sun', note: '' })
      await load()
    } catch { toast.error('حدث خطأ') } finally { setSaving(false) }
  }

  const handleDelete = async (id: string, authorId: string) => {
    if (authorId !== user!.id) { toast.error('لا يمكنك حذف ملاحظات الآخرين'); return }
    if (!confirm('هل تريد حذف هذه الملاحظة؟')) return
    try {
      await deleteScheduleNote(id)
      toast.success('تم الحذف')
      await load()
    } catch { toast.error('حدث خطأ') }
  }

  if (loading) return <div className="flex justify-center p-20"><LoadingSpinner size="lg" /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="section-title mb-0">ملاحظات الجدول</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="h-5 w-5" /> إضافة ملاحظة
        </button>
      </div>

      <div className="bg-gold-xlight border border-gold-light rounded-xl px-4 py-2 text-center text-sm font-bold text-brown-dark">
        مجموعة {group === 'A' ? 'أ' : 'ب'}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {DAYS.map(day => {
          const dayNotes = notes.filter(n => n.day === day)
          return (
            <div key={day} className="card border border-sand">
              <div className="bg-sand rounded-xl px-3 py-2 mb-3 text-center">
                <p className="font-bold text-brown-dark text-sm">{DAY_LABELS[day]}</p>
                <p className="text-xs text-brown">{config[day]}</p>
              </div>
              <div className="space-y-2">
                {dayNotes.length === 0 ? (
                  <p className="text-xs text-brown-light text-center py-1">لا توجد ملاحظات</p>
                ) : dayNotes.map(note => (
                  <div key={note.id} className="bg-cream rounded-lg p-2 text-xs">
                    <p className="text-brown">{note.note}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-brown-xlight">{note.authorName}</span>
                      {note.authorId === user!.id && (
                        <button onClick={() => handleDelete(note.id, note.authorId)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="إضافة ملاحظة للجدول">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brown mb-1.5">اليوم</label>
            <select value={form.day} onChange={e => setForm({ ...form, day: e.target.value as typeof DAYS[number] })} className="input-field">
              {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]} - {config[d]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-brown mb-1.5">الملاحظة</label>
            <textarea
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              className="input-field resize-none"
              rows={4}
              placeholder="اكتب الملاحظة للطلاب..."
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} disabled={saving} className="btn-primary flex-1">
              {saving ? 'جاري الإضافة...' : 'إضافة'}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">إلغاء</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
