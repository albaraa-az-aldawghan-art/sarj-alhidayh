import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Lock, User } from 'lucide-react'
import toast from 'react-hot-toast'
import Logo from '../components/common/Logo'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useAuth } from '../contexts/AuthContext'
import { loginSupervisor, loginTeacher, loginStudent, initializeFirstSupervisor } from '../firebase/db'

const roleLabels: Record<string, string> = {
  supervisor: 'مشرف',
  teacher: 'معلم',
  student: 'طالب',
}

export default function LoginPage() {
  const [params] = useSearchParams()
  const role = params.get('role') || 'student'
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('يرجى إدخال الاسم'); return }
    if (!code.trim()) { toast.error('يرجى إدخال الكود'); return }

    setLoading(true)
    try {
      if (role === 'supervisor') {
        await initializeFirstSupervisor()
        const sup = await loginSupervisor(name, code)
        if (!sup) { toast.error('الاسم أو الكود غير صحيح'); return }
        login({ id: sup.id, role: 'supervisor', name: sup.name, code: sup.code })
        navigate('/supervisor')
      } else if (role === 'teacher') {
        const teacher = await loginTeacher(name, code)
        if (!teacher) { toast.error('الاسم أو الكود غير صحيح'); return }
        const teacherGroup: 'A' | 'B' = teacher.circle === 'ب' ? 'B' : 'A'
        login({ id: teacher.id, role: 'teacher', name: teacher.name, code: teacher.code, supervisorId: teacher.supervisorId, group: teacherGroup })
        navigate('/teacher')
      } else {
        const student = await loginStudent(name, code)
        if (!student) { toast.error('الاسم أو الكود غير صحيح'); return }
        login({ id: student.id, role: 'student', name: student.name, code: student.code, supervisorId: student.supervisorId, group: student.group })
        navigate('/student')
      }
    } catch (err: unknown) {
      toast.error('حدث خطأ، يرجى المحاولة مرة أخرى')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream pattern-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo size="md" showText={true} />
        </div>

        <div className="card shadow-xl">
          <div className="bg-sand-light rounded-xl p-4 mb-6 text-center">
            <h2 className="text-2xl font-bold text-brown-dark font-amiri">
              تسجيل دخول {roleLabels[role]}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-brown mb-1.5">الاسم الكامل</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brown-xlight" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="أدخل اسمك كاملاً"
                  className="input-field pr-10"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-brown mb-1.5">رقم الكود</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brown-xlight" />
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder={role === 'supervisor' ? 'مثال: 2001' : 'أدخل الكود'}
                  className="input-field pr-10"
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 mt-2">
              {loading ? <LoadingSpinner size="sm" /> : (
                <>
                  <span>دخول</span>
                  <Lock className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-brown-light hover:text-brown-dark transition-colors mt-6 mx-auto"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة لاختيار الدور</span>
        </button>
      </div>
    </div>
  )
}
