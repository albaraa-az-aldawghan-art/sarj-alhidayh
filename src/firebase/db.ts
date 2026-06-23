import {
  collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, Timestamp,
  onSnapshot, writeBatch, serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import type {
  Supervisor, Teacher, Student, MemorizationRecord, MemorizationSection,
  AttendanceRecord, ScheduleNote, ScheduleConfig, WeeklyAward, Challenge,
} from '../types'
import { calcTotalPoints } from '../utils/pointsCalculator'
import { getWeekStart, getWeekEnd } from '../utils/dateHelpers'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDate(v: unknown): Date {
  if (!v) return new Date()
  if (v instanceof Timestamp) return v.toDate()
  if (v instanceof Date) return v
  return new Date()
}

function mapDoc<T>(snap: { id: string; data: () => Record<string, unknown> }): T {
  const data = snap.data()
  const converted: Record<string, unknown> = { id: snap.id }
  for (const key of Object.keys(data)) {
    const val = data[key]
    if (val instanceof Timestamp) {
      converted[key] = val.toDate()
    } else {
      converted[key] = val
    }
  }
  return converted as T
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initializeFirstSupervisor() {
  const snap = await getDocs(collection(db, 'supervisors'))
  if (!snap.empty) return
  await setDoc(doc(db, 'supervisors', 'ali_2001'), {
    name: 'علي',
    code: '2001',
    createdAt: serverTimestamp(),
  })
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function matchLogin(data: Record<string, unknown>, name: string, code: string): boolean {
  return String(data.code ?? '').trim() === code.trim() &&
         String(data.name ?? '').trim() === name.trim()
}

export async function loginSupervisor(name: string, code: string): Promise<Supervisor | null> {
  const snap = await getDocs(collection(db, 'supervisors'))
  const match = snap.docs.find(d => matchLogin(d.data() as Record<string, unknown>, name, code))
  return match ? mapDoc<Supervisor>(match) : null
}

export async function loginTeacher(name: string, code: string): Promise<Teacher | null> {
  const snap = await getDocs(collection(db, 'teachers'))
  const match = snap.docs.find(d => matchLogin(d.data() as Record<string, unknown>, name, code))
  return match ? mapDoc<Teacher>(match) : null
}

export async function loginStudent(name: string, code: string): Promise<Student | null> {
  const snap = await getDocs(collection(db, 'students'))
  const match = snap.docs.find(d => matchLogin(d.data() as Record<string, unknown>, name, code))
  return match ? mapDoc<Student>(match) : null
}

// ─── Supervisors ──────────────────────────────────────────────────────────────

export async function getSupervisors(): Promise<Supervisor[]> {
  const snap = await getDocs(query(collection(db, 'supervisors'), orderBy('createdAt')))
  return snap.docs.map(d => mapDoc<Supervisor>(d))
}

export async function addSupervisor(name: string, code: string): Promise<void> {
  const existing = await getDocs(query(collection(db, 'supervisors'), where('code', '==', code)))
  if (!existing.empty) throw new Error('الكود مستخدم من قبل')
  await addDoc(collection(db, 'supervisors'), { name, code, createdAt: serverTimestamp() })
}

export async function updateSupervisor(id: string, name: string, code: string): Promise<void> {
  await updateDoc(doc(db, 'supervisors', id), { name, code })
}

export async function deleteSupervisor(id: string): Promise<void> {
  await deleteDoc(doc(db, 'supervisors', id))
}

// ─── Teachers ─────────────────────────────────────────────────────────────────

export async function getTeachers(): Promise<Teacher[]> {
  const snap = await getDocs(query(collection(db, 'teachers'), orderBy('createdAt')))
  return snap.docs.map(d => mapDoc<Teacher>(d))
}

export async function addTeacher(data: Omit<Teacher, 'id' | 'createdAt'>): Promise<void> {
  const existing = await getDocs(query(collection(db, 'teachers'), where('code', '==', data.code)))
  if (!existing.empty) throw new Error('الكود مستخدم من قبل')
  await addDoc(collection(db, 'teachers'), { ...data, createdAt: serverTimestamp() })
}

export async function updateTeacher(id: string, data: Partial<Teacher>): Promise<void> {
  await updateDoc(doc(db, 'teachers', id), data)
}

export async function deleteTeacher(id: string): Promise<void> {
  await deleteDoc(doc(db, 'teachers', id))
}

// ─── Students ─────────────────────────────────────────────────────────────────

export async function getStudents(): Promise<Student[]> {
  const snap = await getDocs(collection(db, 'students'))
  const students = snap.docs.map(d => mapDoc<Student>(d))
  return students.sort((a, b) => b.totalPoints - a.totalPoints)
}

export async function getStudentsBySupervisor(supervisorId: string): Promise<Student[]> {
  const q = query(collection(db, 'students'), where('supervisorId', '==', supervisorId))
  const snap = await getDocs(q)
  const students = snap.docs.map(d => mapDoc<Student>(d))
  return students.sort((a, b) => b.totalPoints - a.totalPoints)
}

export async function addStudent(data: Omit<Student, 'id' | 'createdAt' | 'totalPoints'>): Promise<string> {
  const existing = await getDocs(query(collection(db, 'students'), where('code', '==', data.code)))
  if (!existing.empty) throw new Error('الكود مستخدم من قبل')
  const ref = await addDoc(collection(db, 'students'), {
    ...data,
    totalPoints: 0,
    createdAt: serverTimestamp(),
  })
  await setDoc(doc(db, 'memorization', ref.id), defaultMemorization(ref.id))
  return ref.id
}

export async function updateStudent(id: string, data: Partial<Student>): Promise<void> {
  await updateDoc(doc(db, 'students', id), data)
}

export async function deleteStudent(id: string): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'students', id))
  batch.delete(doc(db, 'memorization', id))
  await batch.commit()
}

// ─── Memorization ─────────────────────────────────────────────────────────────

function defaultSection() {
  return { current: 0, completed: false, completedAt: null, bonusAwarded: false }
}

function defaultMemorization(studentId: string): Omit<MemorizationRecord, 'lastUpdatedAt'> & { lastUpdatedAt: ReturnType<typeof serverTimestamp> } {
  return {
    studentId,
    juzAmma: defaultSection(),
    juzTabarak: defaultSection(),
    jazariyya: defaultSection(),
    fortyHadith: defaultSection(),
    rahbiyya: defaultSection(),
    zubd: defaultSection(),
    lastUpdatedBy: '',
    lastUpdatedAt: serverTimestamp(),
  }
}

export async function getMemorization(studentId: string): Promise<MemorizationRecord | null> {
  const snap = await getDoc(doc(db, 'memorization', studentId))
  if (!snap.exists()) return null
  return mapDoc<MemorizationRecord>(snap)
}

export function subscribeMemorization(
  studentId: string,
  cb: (rec: MemorizationRecord | null) => void
) {
  return onSnapshot(doc(db, 'memorization', studentId), snap => {
    if (!snap.exists()) { cb(null); return }
    cb(mapDoc<MemorizationRecord>(snap))
  })
}

export async function updateMemorizationSection(
  studentId: string,
  section: string,
  current: number,
  supervisorId: string
): Promise<void> {
  const memRef = doc(db, 'memorization', studentId)
  const snap = await getDoc(memRef)
  if (!snap.exists()) return

  const data = snap.data() as Record<string, unknown>
  const sec = data[section] as { current: number; completed: boolean; bonusAwarded: boolean }

  await updateDoc(memRef, {
    [`${section}.current`]: current,
    lastUpdatedBy: supervisorId,
    lastUpdatedAt: serverTimestamp(),
  })

  await syncStudentPoints(studentId)
}

export async function toggleSectionCompleted(
  studentId: string,
  section: string,
  completed: boolean,
  supervisorId: string
): Promise<void> {
  const memRef = doc(db, 'memorization', studentId)
  const snap = await getDoc(memRef)
  if (!snap.exists()) return

  const data = snap.data() as Record<string, unknown>
  const sec = data[section] as { bonusAwarded: boolean }
  const wasBonus = sec.bonusAwarded

  const updates: Record<string, unknown> = {
    [`${section}.completed`]: completed,
    [`${section}.completedAt`]: completed ? serverTimestamp() : null,
    [`${section}.bonusAwarded`]: completed ? true : false,
    lastUpdatedBy: supervisorId,
    lastUpdatedAt: serverTimestamp(),
  }

  await updateDoc(memRef, updates)
  await syncStudentPoints(studentId)
}

async function syncStudentPoints(studentId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'memorization', studentId))
  if (!snap.exists()) return
  const mem = mapDoc<MemorizationRecord>(snap)
  const total = calcTotalPoints(mem)
  await updateDoc(doc(db, 'students', studentId), { totalPoints: total })
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function getAttendanceByDate(date: Date, group: 'A' | 'B'): Promise<AttendanceRecord[]> {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  const q = query(
    collection(db, 'attendance'),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<', Timestamp.fromDate(end))
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => mapDoc<AttendanceRecord>(d)).filter(r => r.group === group)
}

export function getTodayAttendance(group: 'A' | 'B'): Promise<AttendanceRecord[]> {
  return getAttendanceByDate(new Date(), group)
}

export async function getStudentAttendance(studentId: string): Promise<AttendanceRecord[]> {
  const q = query(collection(db, 'attendance'), where('studentId', '==', studentId))
  const snap = await getDocs(q)
  const records = snap.docs.map(d => mapDoc<AttendanceRecord>(d))
  return records.sort((a, b) => {
    const ta = a.date instanceof Date ? a.date.getTime() : 0
    const tb = b.date instanceof Date ? b.date.getTime() : 0
    return tb - ta
  })
}

export async function saveAttendance(records: Omit<AttendanceRecord, 'id'>[]): Promise<void> {
  const batch = writeBatch(db)
  for (const r of records) {
    const ref = doc(collection(db, 'attendance'))
    const d = r.date instanceof Date ? r.date : new Date(r.date)
    batch.set(ref, { ...r, date: Timestamp.fromDate(d) })
  }
  await batch.commit()
}

export async function updateAttendanceRecord(id: string, data: Partial<AttendanceRecord>): Promise<void> {
  await updateDoc(doc(db, 'attendance', id), data)
}

// ─── Schedule Notes ───────────────────────────────────────────────────────────

export async function getScheduleNotes(group: 'A' | 'B'): Promise<ScheduleNote[]> {
  const q = query(collection(db, 'schedule_notes'), where('group', '==', group))
  const snap = await getDocs(q)
  const notes = snap.docs.map(d => mapDoc<ScheduleNote>(d))
  return notes.sort((a, b) => {
    const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : 0
    const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : 0
    return tb - ta
  })
}

export async function addScheduleNote(data: Omit<ScheduleNote, 'id' | 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'schedule_notes'), { ...data, createdAt: serverTimestamp() })
}

export async function deleteScheduleNote(id: string): Promise<void> {
  await deleteDoc(doc(db, 'schedule_notes', id))
}

// ─── Schedule Config ──────────────────────────────────────────────────────────

export async function getScheduleConfig(group: 'A' | 'B'): Promise<ScheduleConfig> {
  const snap = await getDoc(doc(db, 'schedule_config', group))
  if (!snap.exists()) {
    return { group, sun: 'فقه', mon: 'فقه', tue: 'نحو', wed: 'نحو' }
  }
  return snap.data() as ScheduleConfig
}

export async function saveScheduleConfig(config: ScheduleConfig): Promise<void> {
  await setDoc(doc(db, 'schedule_config', config.group), config)
}

// ─── Weekly Awards ────────────────────────────────────────────────────────────

export function subscribeWeeklyAwards(cb: (awards: WeeklyAward[]) => void) {
  const q = query(collection(db, 'weekly_awards'), orderBy('weekStart', 'desc'))
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => mapDoc<WeeklyAward>(d)))
  })
}

export async function addWeeklyAward(data: Omit<WeeklyAward, 'id'>): Promise<void> {
  await addDoc(collection(db, 'weekly_awards'), {
    ...data,
    weekStart: Timestamp.fromDate(data.weekStart),
    weekEnd: Timestamp.fromDate(data.weekEnd),
    createdAt: serverTimestamp(),
  })
}

export async function updateWeeklyAward(id: string, data: Partial<Omit<WeeklyAward, 'id'>>): Promise<void> {
  const updates: Record<string, unknown> = { ...data }
  if (data.weekStart) updates.weekStart = Timestamp.fromDate(data.weekStart)
  if (data.weekEnd) updates.weekEnd = Timestamp.fromDate(data.weekEnd)
  await updateDoc(doc(db, 'weekly_awards', id), updates)
}

export async function deleteWeeklyAward(id: string): Promise<void> {
  await deleteDoc(doc(db, 'weekly_awards', id))
}

export async function setWeeklyAward(data: Omit<WeeklyAward, 'id'>): Promise<void> {
  const weekKey = data.weekStart.toISOString().split('T')[0]
  await setDoc(doc(db, 'weekly_awards', weekKey), {
    ...data,
    weekStart: Timestamp.fromDate(data.weekStart),
    weekEnd: Timestamp.fromDate(data.weekEnd),
  })
}

// ─── Public Stats ─────────────────────────────────────────────────────────────

const BOOK_LABELS: Record<string, string> = {
  juzAmma: 'جزء عم',
  juzTabarak: 'جزء تبارك',
  jazariyya: 'متن الجمزورية',
  fortyHadith: 'الأربعين النووية',
  rahbiyya: 'متن الرحبية',
  zubd: 'متن الزبد',
}

export async function getPublicStats() {
  const [studentsSnap, memSnap] = await Promise.all([
    getDocs(collection(db, 'students')),
    getDocs(collection(db, 'memorization')),
  ])

  const studentMap = new Map(studentsSnap.docs.map(d => [d.id, (d.data() as Student).name]))
  const mems = memSnap.docs.map(d => d.data() as MemorizationRecord)

  let totalPages = 0
  let totalVerses = 0
  let totalHadith = 0
  let totalCompletedMutoon = 0
  const totalStudents = studentsSnap.size
  const completions: Array<{ studentName: string; bookName: string }> = []

  for (const m of mems) {
    totalPages += (m.juzAmma?.current ?? 0) + (m.juzTabarak?.current ?? 0)
    totalVerses += (m.jazariyya?.current ?? 0) + (m.rahbiyya?.current ?? 0) + (m.zubd?.current ?? 0)
    totalHadith += m.fortyHadith?.current ?? 0
    const studentName = studentMap.get(m.studentId) ?? 'طالب'
    for (const key of Object.keys(BOOK_LABELS)) {
      const section = (m as unknown as Record<string, MemorizationSection>)[key]
      if (section?.completed) {
        totalCompletedMutoon++
        completions.push({ studentName, bookName: BOOK_LABELS[key] })
      }
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [todaySnap, allAttendanceSnap] = await Promise.all([
    getDocs(query(
      collection(db, 'attendance'),
      where('date', '>=', Timestamp.fromDate(today)),
      where('date', '<', Timestamp.fromDate(tomorrow))
    )),
    getDocs(collection(db, 'attendance')),
  ])

  const todayPresent = todaySnap.docs.filter(d => (d.data() as AttendanceRecord).present === true).length
  const totalAttendance = allAttendanceSnap.docs.filter(d => (d.data() as AttendanceRecord).present === true).length

  return {
    totalStudents,
    totalPages,
    totalVerses,
    totalHadith,
    totalCompletedMutoon,
    todayStudents: todayPresent,
    totalAttendance,
    completions,
  }
}

// ─── Challenges ───────────────────────────────────────────────────────────────

export function subscribeChallenges(cb: (challenges: Challenge[]) => void) {
  const q = query(collection(db, 'challenges'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap => cb(snap.docs.map(d => mapDoc<Challenge>(d))))
}

export async function addChallenge(data: Omit<Challenge, 'id'>): Promise<void> {
  await addDoc(collection(db, 'challenges'), { ...data, createdAt: serverTimestamp() })
}

export async function updateChallenge(id: string, data: Partial<Omit<Challenge, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'challenges', id), data)
}

export async function deleteChallenge(id: string): Promise<void> {
  await deleteDoc(doc(db, 'challenges', id))
}

function computeChallengeScore(p: { sun: number; mon: number; tue: number; wed: number }): number {
  return (['sun', 'mon', 'tue', 'wed'] as const).reduce((sum, k) => {
    const v = Number(p[k]) || 0
    return v > 0 ? sum + v + 0.5 : sum
  }, 0)
}

export async function resetChallengeWeek(id: string, weekLabel: string): Promise<void> {
  const ref = doc(db, 'challenges', id)
  const snap = await getDoc(ref)
  const data = snap.data() as Record<string, unknown>
  const groups = (data.groups ?? []) as Challenge['groups']
  const existing = (data.weekHistory ?? []) as Challenge['weekHistory']

  const groupData = groups.map(g => ({
    groupId: g.id,
    groupName: g.name,
    participants: g.students.map(s => ({
      studentId: s.studentId,
      studentName: s.studentName,
      score: computeChallengeScore(s),
    })),
  }))

  const resetGroups = groups.map(g => ({
    ...g,
    students: g.students.map(s => ({ ...s, sun: 0, mon: 0, tue: 0, wed: 0 })),
  }))

  await updateDoc(ref, {
    groups: resetGroups,
    weekHistory: [...existing, { weekLabel, groupData }],
  })
}
