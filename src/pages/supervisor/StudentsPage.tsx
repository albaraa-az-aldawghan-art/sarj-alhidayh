import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Edit2, Search, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { getStudents, getSupervisors, addStudent, updateStudent, deleteStudent, getAllAbsences } from '../../firebase/db'
import type { Student, Supervisor } from '../../types'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'

type AbsenceMap = Map<string, { count: number; dates: Date[] }>

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState<'all' | 'A' | 'B'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [form, setForm] = useState({ name: '', code: '', group: 'A' as 'A' | 'B', supervisorId: '' })
  const [saving, setSaving] = useState(false)
  const [absenceMap, setAbsenceMap] = useState<AbsenceMap>(new Map())

  const load = async () => {
    const [s, sup, absRecs] = await Promise.all([getStudents(), getSupervisors(), getAllAbsences()])
    setStudents(s)
    setSupervisors(sup)
    if (sup.length > 0 && !form.supervisorId) {
      setForm(f => ({ ...f, supervisorId: sup[0].id }))
    }
    const map: AbsenceMap = new Map()
    for (const r of absRecs) {
      const d = r.date instanceof Date ? r.date : new Date(r.date)
      const ex = map.get(r.studentId)
      if (ex) { ex.count++; ex.dates.push(d) }
      else map.set(r.studentId, { count: 1, dates: [d] })
    }
    setAbsenceMap(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditStudent(null)
    setForm({ name: '', code: '', group: 'A', supervisorId: supervisors[0]?.id || '' })
    setShowModal(true)
  }

  const openEdit = (s: Student) => {
    setEditStudent(s)
    setForm({ name: s.name, code: s.code, group: s.group, supervisorId: s.supervisorId })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.code || !form.supervisorId) {
      toast.error('يرجى تعبئة جميع الحقول')
      return
    }
    setSaving(true)
    try {
      if (editStudent) {
        await updateStudent(editStudent.id, form)
        toast.success('تم تحديث بيانات الطالب')
      } else {
        await addStudent(form)
        toast.success('تم إضافة الطالب بنجاح')
      }
      setShowModal(false)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (s: Student) => {
    if (!confirm(`هل تريد حذف الطالب "${s.name}"؟ سيتم حذف جميع بياناته.`)) return
    try {
      await deleteStudent(s.id)
      toast.success('تم حذف الطالب')
      await load()
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  const filtered = students.filter(s => {
    const matchSearch = s.name.includes(search) || s.code.includes(search)
    const matchGroup = filterGroup === 'all' || s.group === filterGroup
    return matchSearch && matchGroup
  })

  if (loading) return <div className="flex justify-center p-20"><LoadingSpinner size="lg" text="جاري التحميل..." /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="section-title mb-0">الطلاب</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" /> إضافة طالب
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brown-xlight" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الكود..."
            className="input-field pr-9"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'A', 'B'] as const).map(g => (
            <button
              key={g}
              onClick={() => setFilterGroup(g)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
                filterGroup === g ? 'bg-gold text-brown-dark shadow-md' : 'bg-parchment text-brown border border-sand hover:bg-sand-light'
              }`}
            >
              {g === 'all' ? 'الكل' : `مجموعة ${g === 'A' ? 'أ' : 'ب'}`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-sand-light">
                <th className="table-header">#</th>
                <th className="table-header">الاسم</th>
                <th className="table-header">الكود</th>
                <th className="table-header">المجموعة</th>
                <th className="table-header">المشرف</th>
                <th className="table-header">النقاط</th>
                <th className="table-header">الغياب</th>
                <th className="table-header">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-brown-light">لا يوجد طلاب</td></tr>
              ) : filtered.map((s, i) => {
                const rank = students.findIndex(st => st.id === s.id) + 1
                const sup = supervisors.find(sv => sv.id === s.supervisorId)
                return (
                  <tr key={s.id} className="hover:bg-cream transition-colors">
                    <td className="table-cell font-bold text-gold-dark">{rank}</td>
                    <td className="table-cell font-semibold text-brown-dark">{s.name}</td>
                    <td className="table-cell"><span className="badge-gold">{s.code}</span></td>
                    <td className="table-cell">{s.group === 'A' ? 'مجموعة أ' : 'مجموعة ب'}</td>
                    <td className="table-cell text-brown">{sup?.name || '-'}</td>
                    <td className="table-cell font-bold text-brown-dark">{s.totalPoints}</td>
                    <td className="table-cell">
                      {(() => {
                        const info = absenceMap.get(s.id)
                        if (!info || info.count === 0) return <span className="text-xs text-gray-400">لم يغب</span>
                        const sorted = [...info.dates].sort((a, b) => b.getTime() - a.getTime())
                        return (
                          <div>
                            <span className="inline-block bg-red-100 text-red-700 font-bold text-xs px-2 py-0.5 rounded-lg border border-red-200 mb-1">
                              {info.count} {info.count === 1 ? 'مرة' : 'مرات'}
                            </span>
                            <div className="space-y-0.5">
                              {sorted.map((d, i) => (
                                <div key={i} className="text-xs text-red-500">
                                  {d.toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/supervisor/memorization/${s.id}`}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="الحفظ"
                        >
                          <BookOpen className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-lg text-brown hover:bg-sand-light transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                          title="حذف"
                        >
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

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editStudent ? 'تعديل طالب' : 'إضافة طالب جديد'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brown mb-1.5">اسم الطالب</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="الاسم الكامل" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-brown mb-1.5">الكود</label>
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="input-field" placeholder="مثال: 1001" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-brown mb-1.5">المجموعة</label>
            <div className="flex gap-3">
              {(['A', 'B'] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm({ ...form, group: g })}
                  className={`flex-1 py-2.5 rounded-xl font-bold transition-colors ${form.group === g ? 'bg-gold text-brown-dark' : 'bg-sand-light text-brown border border-sand'}`}
                >
                  مجموعة {g === 'A' ? 'أ' : 'ب'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-brown mb-1.5">المشرف (الحفظ)</label>
            <select
              value={form.supervisorId}
              onChange={e => setForm({ ...form, supervisorId: e.target.value })}
              className="input-field"
            >
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
