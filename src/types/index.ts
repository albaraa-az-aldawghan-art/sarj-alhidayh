export type UserRole = 'supervisor' | 'teacher' | 'student'

export interface Supervisor {
  id: string
  name: string
  code: string
  createdAt: Date
}

export interface Teacher {
  id: string
  name: string
  code: string
  circle: string
  supervisorId: string
  createdAt: Date
}

export interface Student {
  id: string
  name: string
  code: string
  group: 'A' | 'B'
  supervisorId: string
  totalPoints: number
  createdAt: Date
}

export interface MemorizationSection {
  current: number
  completed: boolean
  completedAt?: Date | null
  bonusAwarded: boolean
}

export interface MemorizationRecord {
  studentId: string
  juzAmma: MemorizationSection      // 23 pages - 1pt per page
  juzTabarak: MemorizationSection   // 20 pages - 1pt per page
  jazariyya: MemorizationSection    // 61 verses - 1pt per 5 verses
  fortyHadith: MemorizationSection  // 42 hadith - 1pt per 2 hadith
  rahbiyya: MemorizationSection     // 176 verses - 1pt per 5 verses
  zubd: MemorizationSection         // 1088 verses - 1pt per 5 verses
  lastUpdatedBy: string
  lastUpdatedAt: Date
}

export interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  date: Date
  present: boolean
  hasBook: boolean
  hasUniform: boolean
  reviewed: boolean
  note: string
  teacherId: string
  teacherName: string
  group: 'A' | 'B'
}

export interface ScheduleNote {
  id: string
  group: 'A' | 'B'
  day: 'sun' | 'mon' | 'tue' | 'wed'
  date: Date
  subject: string
  note: string
  authorId: string
  authorName: string
  authorRole: 'supervisor' | 'teacher'
  createdAt: Date
}

export interface ScheduleConfig {
  group: 'A' | 'B'
  sun: string
  mon: string
  tue: string
  wed: string
}

export interface WeeklyAward {
  id: string
  weekLabel: string
  weekStart: Date
  weekEnd: Date
  idealStudentId: string
  idealStudentName: string
  topMemorizerId: string
  topMemorizerName: string
  setBy: string
  createdAt?: Date
}

export interface AuthUser {
  id: string
  role: UserRole
  name: string
  code: string
  supervisorId?: string
  group?: 'A' | 'B'
}

export const MEMORIZATION_LIMITS = {
  juzAmma: 23,
  juzTabarak: 20,
  jazariyya: 61,
  fortyHadith: 42,
  rahbiyya: 176,
  zubd: 1088,
} as const

export const MEMORIZATION_LABELS: Record<keyof typeof MEMORIZATION_LIMITS, string> = {
  juzAmma: 'جزء عم',
  juzTabarak: 'جزء تبارك',
  jazariyya: 'متن الجزرية',
  fortyHadith: 'الأربعين النووية',
  rahbiyya: 'متن الرحبية',
  zubd: 'متن الزبد',
}

export const MEMORIZATION_UNITS: Record<keyof typeof MEMORIZATION_LIMITS, string> = {
  juzAmma: 'صفحة',
  juzTabarak: 'صفحة',
  jazariyya: 'بيت',
  fortyHadith: 'حديث',
  rahbiyya: 'بيت',
  zubd: 'بيت',
}

export const DAY_LABELS: Record<string, string> = {
  sun: 'الأحد',
  mon: 'الاثنين',
  tue: 'الثلاثاء',
  wed: 'الأربعاء',
}
