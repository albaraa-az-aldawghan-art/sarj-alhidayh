import type { MemorizationRecord } from '../types'

export function calcSectionPoints(
  key: 'juzAmma' | 'juzTabarak' | 'jazariyya' | 'fortyHadith' | 'rahbiyya' | 'zubd',
  current: number,
  bonusAwarded: boolean
): number {
  let base = 0
  if (key === 'juzAmma' || key === 'juzTabarak') {
    base = current
  } else if (key === 'fortyHadith') {
    base = Math.floor(current / 2)
  } else {
    base = Math.floor(current / 5)
  }
  return base + (bonusAwarded ? 5 : 0)
}

export function calcTotalPoints(mem: MemorizationRecord): number {
  const keys = ['juzAmma', 'juzTabarak', 'jazariyya', 'fortyHadith', 'rahbiyya', 'zubd'] as const
  return keys.reduce((sum, key) => {
    return sum + calcSectionPoints(key, mem[key].current, mem[key].bonusAwarded)
  }, 0)
}

export function calcSectionBasePoints(
  key: 'juzAmma' | 'juzTabarak' | 'jazariyya' | 'fortyHadith' | 'rahbiyya' | 'zubd',
  current: number
): number {
  if (key === 'juzAmma' || key === 'juzTabarak') return current
  if (key === 'fortyHadith') return Math.floor(current / 2)
  return Math.floor(current / 5)
}

export function getProgressPercent(key: string, current: number): number {
  const limits: Record<string, number> = {
    juzAmma: 23,
    juzTabarak: 20,
    jazariyya: 61,
    fortyHadith: 42,
    rahbiyya: 176,
    zubd: 1088,
  }
  const limit = limits[key] || 1
  return Math.min(100, Math.round((current / limit) * 100))
}
