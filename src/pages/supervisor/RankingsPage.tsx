import { useEffect, useState } from 'react'
import { Trophy, Medal, Search } from 'lucide-react'
import { getStudents, getSupervisors } from '../../firebase/db'
import type { Student, Supervisor } from '../../types'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { useAuth } from '../../contexts/AuthContext'

export default function RankingsPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSup, setFilterSup] = useState('all')

  useEffect(() => {
    Promise.all([getStudents(), getSupervisors()]).then(([s, sup]) => {
      setStudents(s)
      setSupervisors(sup)
      setLoading(false)
    })
  }, [])

  const filtered = students.filter(s => {
    const matchSearch = !search || s.name.includes(search)
    const matchSup = filterSup === 'all' || s.supervisorId === filterSup
    return matchSearch && matchSup
  })

  const rankIcon = (rank: number) => {
    if (rank === 1) return <span className="text-2xl">🥇</span>
    if (rank === 2) return <span className="text-2xl">🥈</span>
    if (rank === 3) return <span className="text-2xl">🥉</span>
    return <span className="w-8 h-8 rounded-full bg-sand-light text-brown font-bold text-sm flex items-center justify-center">{rank}</span>
  }

  if (loading) return <div className="flex justify-center p-20"><LoadingSpinner size="lg" /></div>

  const myStudents = students.filter(s => s.supervisorId === user?.id)

  return (
    <div className="space-y-5">
      <h1 className="section-title">الترتيب العام</h1>

      {/* My students highlight */}
      <div className="card border-2 border-gold-light">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-gold" />
          <h2 className="font-bold text-brown-dark">مراكز طلابي في الترتيب العام</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {myStudents.length === 0 ? (
            <p className="col-span-3 text-center text-brown-light">لا يوجد طلاب مضافون</p>
          ) : myStudents.map(s => {
            const globalRank = students.findIndex(st => st.id === s.id) + 1
            return (
              <div key={s.id} className="bg-gold-xlight rounded-xl p-3 text-center border border-gold-light">
                <p className="font-bold text-brown-dark text-sm">{s.name}</p>
                <div className="flex justify-center mt-1">{rankIcon(globalRank)}</div>
                <p className="text-xs text-brown-light mt-1">{s.totalPoints} نقطة</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brown-xlight" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم..."
            className="input-field pr-9"
          />
        </div>
        <select
          value={filterSup}
          onChange={e => setFilterSup(e.target.value)}
          className="input-field sm:w-48"
        >
          <option value="all">جميع المشرفين</option>
          {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Rankings list */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-sand-light">
                <th className="table-header">المركز</th>
                <th className="table-header">الاسم</th>
                <th className="table-header">المجموعة</th>
                <th className="table-header">المشرف</th>
                <th className="table-header">النقاط</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-brown-light">لا يوجد طلاب</td></tr>
              ) : filtered.map(s => {
                const globalRank = students.findIndex(st => st.id === s.id) + 1
                const sup = supervisors.find(sv => sv.id === s.supervisorId)
                const isMe = s.supervisorId === user?.id
                return (
                  <tr key={s.id} className={`hover:bg-cream transition-colors ${isMe ? 'bg-gold-xlight/50' : ''}`}>
                    <td className="table-cell">
                      <div className="flex items-center justify-center">
                        {rankIcon(globalRank)}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`font-semibold ${isMe ? 'text-gold-dark' : 'text-brown-dark'}`}>{s.name}</span>
                      {isMe && <span className="mr-2 text-xs text-gold-dark">(من طلابك)</span>}
                    </td>
                    <td className="table-cell">{s.group === 'A' ? 'مجموعة أ' : 'مجموعة ب'}</td>
                    <td className="table-cell text-brown">{sup?.name || '-'}</td>
                    <td className="table-cell">
                      <span className="font-bold text-brown-dark text-lg">{s.totalPoints}</span>
                      <span className="text-xs text-brown-light mr-1">نقطة</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
