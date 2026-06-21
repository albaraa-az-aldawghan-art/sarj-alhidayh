import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSupervisors, addSupervisor, updateSupervisor, deleteSupervisor } from '../../firebase/db'
import type { Supervisor } from '../../types'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { useAuth } from '../../contexts/AuthContext'

export default function SupervisorsPage() {
  const { user } = useAuth()
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editSup, setEditSup] = useState<Supervisor | null>(null)
  const [form, setForm] = useState({ name: '', code: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setSupervisors(await getSupervisors())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditSup(null)
    setForm({ name: '', code: '' })
    setShowModal(true)
  }

  const openEdit = (s: Supervisor) => {
    setEditSup(s)
    setForm({ name: s.name, code: s.code })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.code) { toast.error('يرجى تعبئة جميع الحقول'); return }
    setSaving(true)
    try {
      if (editSup) {
        await updateSupervisor(editSup.id, form.name, form.code)
        toast.success('تم التحديث')
      } else {
        await addSupervisor(form.name, form.code)
        toast.success('تم إضافة المشرف بنجاح')
      }
      setShowModal(false)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (s: Supervisor) => {
    if (s.id === user?.id) { toast.error('لا يمكنك حذف حسابك الخاص'); return }
    if (!confirm(`هل تريد حذف المشرف "${s.name}"؟`)) return
    try {
      await deleteSupervisor(s.id)
      toast.success('تم الحذف')
      await load()
    } catch { toast.error('حدث خطأ') }
  }

  if (loading) return <div className="flex justify-center p-20"><LoadingSpinner size="lg" text="جاري التحميل..." /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="section-title mb-0">المشرفون</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" /> إضافة مشرف
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {supervisors.map(s => (
          <div key={s.id} className={`card border-2 ${s.id === user?.id ? 'border-gold' : 'border-transparent'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gold-xlight rounded-xl">
                  <Shield className="h-6 w-6 text-gold-dark" />
                </div>
                <div>
                  <p className="font-bold text-brown-dark">{s.name}</p>
                  <p className="text-xs text-brown-light">كود: {s.code}</p>
                </div>
              </div>
              {s.id === user?.id && <span className="badge-gold">أنت</span>}
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-sand-light">
              <button onClick={() => openEdit(s)} className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1.5">
                <Edit2 className="h-3.5 w-3.5" /> تعديل
              </button>
              {s.id !== user?.id && (
                <button onClick={() => handleDelete(s)} className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 border border-red-200 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editSup ? 'تعديل مشرف' : 'إضافة مشرف جديد'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brown mb-1.5">اسم المشرف</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="الاسم الكامل" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-brown mb-1.5">كود الدخول</label>
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="input-field" placeholder="مثال: 2002" />
          </div>
          <div className="bg-gold-xlight rounded-xl p-3 text-xs text-brown border border-gold-light">
            سيستخدم هذا الكود لتسجيل دخول المشرف الجديد
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
