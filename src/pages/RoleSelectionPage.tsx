import { useNavigate } from 'react-router-dom'
import { Shield, BookOpen, GraduationCap } from 'lucide-react'
import Logo from '../components/common/Logo'

const roles = [
  {
    key: 'supervisor',
    label: 'مشرف',
    desc: 'إدارة الطلاب والحفظ والنقاط',
    icon: Shield,
    color: 'hover:border-gold hover:bg-gold-xlight',
    iconColor: 'text-gold-dark',
  },
  {
    key: 'teacher',
    label: 'معلم',
    desc: 'تسجيل الحضور والملاحظات',
    icon: BookOpen,
    color: 'hover:border-blue-400 hover:bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    key: 'student',
    label: 'طالب',
    desc: 'متابعة النقاط والتقدم',
    icon: GraduationCap,
    color: 'hover:border-green-400 hover:bg-green-50',
    iconColor: 'text-green-600',
  },
]

export default function RoleSelectionPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cream pattern-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Logo size="lg" showText={true} />
          <p className="mt-4 text-brown font-semibold">اختر نوع حسابك للمتابعة</p>
        </div>

        <div className="flex flex-col gap-4">
          {roles.map(role => (
            <button
              key={role.key}
              onClick={() => navigate(`/login?role=${role.key}`)}
              className={`card flex items-center gap-5 p-5 border-2 border-transparent
                transition-all duration-200 cursor-pointer text-right w-full
                active:scale-98 shadow-md hover:shadow-lg ${role.color}`}
            >
              <div className={`p-3 rounded-2xl bg-parchment shadow-sm ${role.iconColor}`}>
                <role.icon className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-brown-dark">{role.label}</h3>
                <p className="text-sm text-brown-light mt-0.5">{role.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/public')}
            className="text-brown-light text-sm hover:text-gold-dark transition-colors underline underline-offset-2"
          >
            عرض الإحصائيات العامة (الباركود)
          </button>
        </div>
      </div>
    </div>
  )
}
