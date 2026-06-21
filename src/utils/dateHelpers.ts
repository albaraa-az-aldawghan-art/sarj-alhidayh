import { startOfWeek, endOfWeek, format } from 'date-fns'
import { arSA } from 'date-fns/locale'

export function getWeekStart(date = new Date()) {
  return startOfWeek(date, { weekStartsOn: 0 })
}

export function getWeekEnd(date = new Date()) {
  return endOfWeek(date, { weekStartsOn: 0 })
}

export function formatDateAr(date: Date): string {
  return format(date, 'dd/MM/yyyy', { locale: arSA })
}

export function getTodayDayKey(): 'sun' | 'mon' | 'tue' | 'wed' | null {
  const day = new Date().getDay()
  const map: Record<number, 'sun' | 'mon' | 'tue' | 'wed'> = {
    0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed',
  }
  return map[day] ?? null
}

export function weekId(date = new Date()): string {
  const start = getWeekStart(date)
  return format(start, 'yyyy-MM-dd')
}
