import { useEffect, useState } from 'react'
import { Trophy, Star, BookOpen, Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getStudents, subscribeWeeklyAwards, addWeeklyAward, updateWeeklyAward, deleteWeeklyAward } from '../../firebase/db'
import type { Student, WeeklyAward } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'

interface AwardForm {
  weekLabel: string
  idealStudentId: string
  topMemorizerId: string
}

const EMPTY_FORM: AwardForm = { weekLabel: '', idealStudentId: '', topMemorizerId: '' }

export default function AwardsPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [awards, setAwards] = useState<WeeklyAward[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AwardForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getStudents()
      .then(s => setStudents(s))
      .catch(() => {})
      .finally(() => setLoading(false))
    const unsub = subscribeWeeklyAwards(setAwards)
    return () => unsub()
  }, [])

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (award: WeeklyAward) => {
    setEditingId(award.id)
    setForm({
      weekLabel: award.weekLabel || '',
      idealStudentId: award.idealStudentId,
      topMemorizerId: award.topMemorizerId,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.weekLabel.trim()) { toast.error('يرجى كتابة اسم الأسبوع'); return }
    if (!form.idealStudentId) { toast.error('يرجى اختيار مثالي الأسبوع'); return }
    if (!form.topMemorizerId) { toast.error('يرجى اختيار حافظ الأسبوع'); return }

    const ideal = students.find(s => s.id === form.idealStudentId)!
    const top = students.find(s => s.id === form.topMemorizerId)!
    const now = new Date()

    setSaving(true)
    try {
      if (editingId) {
        await updateWeeklyAward(editingId, {
          weekLabel: form.weekLabel.trim(),
          idealStudentId: ideal.id,
          idealStudentName: ideal.name,
          topMemorizerId: top.id,
          topMemorizerName: top.name,
        })
        toast.success('تم التعديل')
      } else {
        await addWeeklyAward({
          weekLabel: form.weekLabel.trim(),
          weekStart: now,
          weekEnd: now,
          idealStudentId: ideal.id,
          idealStudentName: ideal.name,
          topMemorizerId: top.id,
          topMemorizerName: top.name,
          setBy: user!.id,
        })
        toast.success('تمت الإضافة')
      }
      setShowModal(false)
      setForm(EMPTY_FORM)
    } catch { toast.error('حدث خطأ') } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذه الجائزة؟')) return
    try {
      await deleteWeeklyAward(id)
      toast.success('تم الحذف')
    } catch { toast.error('حدث خطأ') }
  }

  if (loading) return <div className="flex justify-center p-20"><LoadingSpinner size="lg" /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="section-title mb-0">مثالي الأسبوع والحافظ</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> إضافة جائزة
        </button>
      </div>

      {awards.length === 0 ? (
        <div className="card text-center py-12">
          <Trophy className="h-12 w-12 text-sand mx-auto mb-3" />
          <p className="text-brown-light">لا توجد جوائز بعد</p>
          <button onClick={openAdd} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> إضافة أول جائزة
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {awards.map(award => (
            <div key={award.id} className="card border-2 border-gold-light">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gold-xlight rounded-lg">
                    <Trophy className="h-5 w-5 text-gold" />
                  </div>
                  <h2 className="font-bold text-brown-dark text-lg">
                    {award.weekLabel || 'جائزة الأسبوع'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(award)}
                    className="p-2 rounded-xl text-brown hover:bg-sand-light transition-colors"
                    title="تعديل"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(award.id)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Award cards */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-gold-xlight border border-gold-light rounded-2xl p-4 text-center">
                  <Star className="h-7 w-7 text-gold mx-auto mb-2" />
                  <p className="text-xs text-brown-light mb-1">مثالي الأسبوع</p>
                  <p className="font-amiri text-xl font-bold text-brown-dark">
                    {award.idealStudentName}
                  </p>
                </div>
                <div className="bg-gold-xlight border border-gold-light rounded-2xl p-4 text-center">
                  <BookOpen className="h-7 w-7 text-gold mx-auto mb-2" />
                  <p className="text-xs text-brown-light mb-1">حافظ الأسبوع</p>
                  <p className="font-amiri text-xl font-bold text-brown-dark">
                    {award.topMemorizerName}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'تعديل الجائزة' : 'إضافة جائزة جديدة'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-brown mb-1.5">
              اسم الأسبوع
            </label>
            <input
              value={form.weekLabel}
              onChange={e => setForm({ ...form, weekLabel: e.target.value })}
              className="input-field"
              placeholder="مثال: الأسبوع الأول، الأسبوع الثاني..."
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-brown mb-1.5 flex items-center gap-1.5">
              <Star className="h-4 w-4 text-gold" /> مثالي الأسبوع
            </label>
            <select
              value={form.idealStudentId}
              onChange={e => setForm({ ...form, idealStudentId: e.target.value })}
              className="input-field"
            >
              <option value="">اختر الطالب...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-brown mb-1.5 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-gold" /> حافظ الأسبوع
            </label>
            <select
              value={form.topMemorizerId}
              onChange={e => setForm({ ...form, topMemorizerId: e.target.value })}
              className="input-field"
            >
              <option value="">اختر الطالب...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديل' : 'إضافة'}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
