import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getTeachers, getSupervisors, addTeacher, updateTeacher, deleteTeacher } from '../../firebase/db'
import type { Teacher, Supervisor } from '../../types'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null)
  const [form, setForm] = useState({ name: '', code: '', circle: '', supervisorId: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [t, s] = await Promise.all([getTeachers(), getSupervisors()])
    setTeachers(t)
    setSupervisors(s)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditTeacher(null)
    setForm({ name: '', code: '', circle: '', supervisorId: supervisors[0]?.id || '' })
    setShowModal(true)
  }

  const openEdit = (t: Teacher) => {
    setEditTeacher(t)
    setForm({ name: t.name, code: t.code, circle: t.circle, supervisorId: t.supervisorId })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.code || !form.circle || !form.supervisorId) {
      toast.error('يرجى تعبئة جميع الحقول')
      return
    }
    setSaving(true)
    try {
      if (editTeacher) {
        await updateTeacher(editTeacher.id, form)
        toast.success('تم تحديث بيانات المعلم')
      } else {
        await addTeacher(form)
        toast.success('تم إضافة المعلم بنجاح')
      }
      setShowModal(false)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (t: Teacher) => {
    if (!confirm(`هل تريد حذف المعلم "${t.name}"؟`)) return
    try {
      await deleteTeacher(t.id)
      toast.success('تم الحذف')
      await load()
    } catch { toast.error('حدث خطأ') }
  }

  if (loading) return <div className="flex justify-center p-20"><LoadingSpinner size="lg" text="جاري التحميل..." /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="section-title mb-0">المعلمون</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" /> إضافة معلم
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-sand-light">
                <th className="table-header">#</th>
                <th className="table-header">الاسم</th>
                <th className="table-header">الكود</th>
                <th className="table-header">الحلقة</th>
                <th className="table-header">المشرف</th>
                <th className="table-header">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-brown-light">لا يوجد معلمون</td></tr>
              ) : teachers.map((t, i) => {
                const sup = supervisors.find(s => s.id === t.supervisorId)
                return (
                  <tr key={t.id} className="hover:bg-cream transition-colors">
                    <td className="table-cell font-bold text-brown-light">{i + 1}</td>
                    <td className="table-cell font-semibold text-brown-dark">{t.name}</td>
                    <td className="table-cell"><span className="badge-gold">{t.code}</span></td>
                    <td className="table-cell text-brown">{t.circle}</td>
                    <td className="table-cell text-brown">{sup?.name || '-'}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-brown hover:bg-sand-light transition-colors">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(t)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTeacher ? 'تعديل معلم' : 'إضافة معلم جديد'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brown mb-1.5">اسم المعلم</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="الاسم الكامل" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-brown mb-1.5">الكود</label>
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="input-field" placeholder="مثال: 3001" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-brown mb-1.5">الحلقة</label>
            <input value={form.circle} onChange={e => setForm({ ...form, circle: e.target.value })} className="input-field" placeholder="مثال: حلقة القرآن الكريم" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-brown mb-1.5">المشرف</label>
            <select value={form.supervisorId} onChange={e => setForm({ ...form, supervisorId: e.target.value })} className="input-field">
              {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">إلغاء</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
