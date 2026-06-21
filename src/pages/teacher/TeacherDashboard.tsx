import { Link } from 'react-router-dom'
import { ClipboardList, CalendarDays, BookOpen } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function TeacherDashboard() {
  const { user } = useAuth()

  const cards = [
    {
      to: '/teacher/attendance',
      icon: ClipboardList,
      label: 'تسجيل الحضور',
      desc: 'تحضير الطلاب وتسجيل الغياب والزي والكتاب',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      to: '/teacher/notes',
      icon: CalendarDays,
      label: 'ملاحظات الجدول',
      desc: 'إضافة ملاحظات للطلاب قبل الحصة أو أثناءها',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-amiri text-3xl font-bold text-brown-dark">أهلاً، {user?.name}</h1>
        <p className="text-brown-light mt-1">لوحة تحكم المعلم</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map(card => (
          <Link
            key={card.to}
            to={card.to}
            className="card flex items-start gap-4 hover:shadow-lg transition-all duration-200 hover:border-gold border-2 border-transparent cursor-pointer"
          >
            <div className={`p-3 rounded-2xl ${card.bg}`}>
              <card.icon className={`h-8 w-8 ${card.color}`} />
            </div>
            <div>
              <h3 className="font-bold text-brown-dark text-lg">{card.label}</h3>
              <p className="text-sm text-brown-light mt-1">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="card bg-gold-xlight border border-gold-light">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-gold-dark mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-brown-dark">تنبيه مهم</h3>
            <p className="text-sm text-brown mt-1">
              دور المعلم يقتصر على تسجيل الحضور وإضافة الملاحظات. إدارة الحفظ والنقاط من اختصاص المشرف فقط.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
