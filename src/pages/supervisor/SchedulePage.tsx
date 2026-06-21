import { useEffect, useState } from 'react'
import { Plus, Trash2, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { getScheduleNotes, addScheduleNote, deleteScheduleNote, getScheduleConfig, saveScheduleConfig } from '../../firebase/db'
import type { ScheduleNote, ScheduleConfig } from '../../types'
import { DAY_LABELS } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { formatDateAr } from '../../utils/dateHelpers'

const DAYS = ['sun', 'mon', 'tue', 'wed'] as const

export default function SchedulePage() {
  const { user } = useAuth()
  const [group, setGroup] = useState<'A' | 'B'>('A')
  const [notes, setNotes] = useState<ScheduleNote[]>([])
  const [config, setConfig] = useState<ScheduleConfig>({ group: 'A', sun: 'فقه', mon: 'فقه', tue: 'نحو', wed: 'نحو' })
  const [loading, setLoading] = useState(true)
  const [showAddNote, setShowAddNote] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [noteForm, setNoteForm] = useState({ day: 'sun' as typeof DAYS[number], note: '' })
  const [configForm, setConfigForm] = useState(config)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const [n, c] = await Promise.all([getScheduleNotes(group), getScheduleConfig(group)])
      setNotes(n)
      setConfig(c)
      setConfigForm(c)
    } catch (e) {
      console.error('خطأ في تحميل الجدول:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    load()
  }, [group])

  const handleAddNote = async () => {
    if (!noteForm.note.trim()) { toast.error('يرجى كتابة الملاحظة'); return }
    setSaving(true)
    try {
      await addScheduleNote({
        group,
        day: noteForm.day,
        date: new Date(),
        subject: config[noteForm.day],
        note: noteForm.note.trim(),
        authorId: user!.id,
        authorName: user!.name,
        authorRole: 'supervisor',
      })
      toast.success('تمت إضافة الملاحظة')
      setShowAddNote(false)
      setNoteForm({ day: 'sun', note: '' })
      await load()
    } catch { toast.error('حدث خطأ') } finally { setSaving(false) }
  }

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      await saveScheduleConfig({ ...configForm, group })
      toast.success('تم حفظ الجدول')
      setShowConfig(false)
      await load()
    } catch { toast.error('حدث خطأ') } finally { setSaving(false) }
  }

  const handleDeleteNote = async (id: string) => {
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
        <h1 className="section-title mb-0">الجدول الأسبوعي</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowConfig(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Settings className="h-4 w-4" /> تعديل الجدول
          </button>
          <button onClick={() => setShowAddNote(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" /> ملاحظة
          </button>
        </div>
      </div>

      {/* Group tabs */}
      <div className="flex gap-3">
        {(['A', 'B'] as const).map(g => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={`px-5 py-2 rounded-xl font-bold transition-colors ${group === g ? 'bg-gold text-brown-dark shadow-md' : 'bg-parchment text-brown border border-sand hover:bg-sand-light'}`}
          >
            مجموعة {g === 'A' ? 'أ' : 'ب'}
          </button>
        ))}
      </div>

      {/* Schedule grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {DAYS.map(day => {
          const dayNotes = notes.filter(n => n.day === day)
          return (
            <div key={day} className="card border border-sand">
              <div className="bg-sand rounded-xl px-3 py-2 mb-3 text-center">
                <p className="font-bold text-brown-dark">{DAY_LABELS[day]}</p>
                <p className="text-xs text-brown mt-0.5 font-semibold">{config[day]}</p>
              </div>
              <div className="space-y-2">
                {dayNotes.length === 0 ? (
                  <p className="text-xs text-brown-light text-center py-2">لا توجد ملاحظات</p>
                ) : dayNotes.slice(0, 3).map(note => (
                  <div key={note.id} className="bg-cream rounded-lg p-2 text-xs">
                    <p className="text-brown">{note.note}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-brown-xlight">{note.authorName}</span>
                      <button onClick={() => handleDeleteNote(note.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* All notes */}
      <div className="card">
        <h2 className="font-bold text-brown-dark mb-3">جميع الملاحظات - مجموعة {group === 'A' ? 'أ' : 'ب'}</h2>
        {notes.length === 0 ? (
          <p className="text-center text-brown-light py-4">لا توجد ملاحظات</p>
        ) : (
          <div className="space-y-2">
            {notes.map(note => (
              <div key={note.id} className="flex items-start gap-3 p-3 bg-cream rounded-xl">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge-gold text-xs">{DAY_LABELS[note.day]}</span>
                    <span className="text-xs text-brown-light">{note.subject}</span>
                    <span className="text-xs text-brown-xlight">{note.date ? formatDateAr(note.date instanceof Date ? note.date : new Date(note.date)) : ''}</span>
                  </div>
                  <p className="text-brown text-sm">{note.note}</p>
                  <p className="text-xs text-brown-xlight mt-1">بواسطة: {note.authorName}</p>
                </div>
                <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Note Modal */}
      <Modal open={showAddNote} onClose={() => setShowAddNote(false)} title="إضافة ملاحظة">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brown mb-1.5">اليوم</label>
            <select value={noteForm.day} onChange={e => setNoteForm({ ...noteForm, day: e.target.value as typeof DAYS[number] })} className="input-field">
              {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]} - {config[d]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-brown mb-1.5">الملاحظة</label>
            <textarea
              value={noteForm.note}
              onChange={e => setNoteForm({ ...noteForm, note: e.target.value })}
              className="input-field resize-none"
              rows={4}
              placeholder="اكتب الملاحظة هنا..."
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleAddNote} disabled={saving} className="btn-primary flex-1">
              {saving ? 'جاري الإضافة...' : 'إضافة'}
            </button>
            <button onClick={() => setShowAddNote(false)} className="btn-secondary flex-1">إلغاء</button>
          </div>
        </div>
      </Modal>

      {/* Config Modal */}
      <Modal open={showConfig} onClose={() => setShowConfig(false)} title={`تعديل جدول مجموعة ${group === 'A' ? 'أ' : 'ب'}`}>
        <div className="space-y-4">
          {DAYS.map(day => (
            <div key={day}>
              <label className="block text-sm font-semibold text-brown mb-1.5">{DAY_LABELS[day]}</label>
              <input
                value={configForm[day]}
                onChange={e => setConfigForm({ ...configForm, [day]: e.target.value })}
                className="input-field"
                placeholder="اسم المادة"
              />
            </div>
          ))}
          <div className="flex gap-3">
            <button onClick={handleSaveConfig} disabled={saving} className="btn-primary flex-1">
              {saving ? 'جاري الحفظ...' : 'حفظ الجدول'}
            </button>
            <button onClick={() => setShowConfig(false)} className="btn-secondary flex-1">إلغاء</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
