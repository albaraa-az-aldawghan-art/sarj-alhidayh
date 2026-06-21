import { useId } from 'react'

interface Props {
  current: number
  max: number
  label: string
  unit: string
  completed: boolean
  size?: 'sm' | 'md' | 'lg'
}

function getMilestoneLabel(pct: number): string {
  if (pct === 0) return 'لم يبدأ'
  if (pct < 15) return 'بداية'
  if (pct < 30) return 'ربع'
  if (pct < 45) return 'ثلث'
  if (pct < 60) return 'نصف'
  if (pct < 72) return 'ثلثين'
  if (pct < 90) return 'ثلاثة أرباع'
  if (pct < 100) return 'يكاد يكمل'
  return 'مكتمل ✓'
}

export function BookProgress({ current, max, label, unit, completed, size = 'md' }: Props) {
  const rawId = useId()
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, 'x')
  const pct = Math.min(100, Math.max(0, Math.round((current / Math.max(max, 1)) * 100)))

  // SVG layout constants
  const SX = 14   // spine start x
  const SW = 13   // spine width
  const BX = SX + SW  // body start x
  const RX = 87   // right edge of front face
  const TY = 14   // top y of front face
  const BY = 86   // bottom y of front face

  // 3D perspective offsets
  const DX = 6
  const DY = 7

  // Fill width (left→right across full book width)
  const TOTAL = RX - SX   // ~73
  const fillW = (pct / 100) * TOTAL

  const sizeMap = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32' }
  const fillColor = completed ? '#C9A84C' : '#D4A840'
  const spineColor = completed ? '#7A5A10' : '#8B6520'
  const dim3DColor = completed ? '#A07810' : '#B08820'

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Book SVG */}
      <div className={sizeMap[size]}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-md"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Clip: reveals filled colored book from left to right */}
            <clipPath id={`fc-${uid}`}>
              <rect x={SX - 1} y={TY - DY - 2} width={fillW + 1} height={BY - TY + DY + DX + 4} />
            </clipPath>

            {/* Blur filter for unfilled ghost book */}
            <filter id={`bf-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
              <feGaussianBlur stdDeviation="1.2" />
            </filter>
          </defs>

          {/* ── LAYER 1: Ghost / unfilled book (blurred, very faint) ── */}
          <g filter={`url(#bf-${uid})`} opacity="0.18">
            {/* 3D top face */}
            <path d={`M ${SX} ${TY} L ${SX + DX} ${TY - DY} L ${RX + DX} ${TY - DY} L ${RX} ${TY} Z`}
              fill="#3D2B1F" />
            {/* 3D right face */}
            <path d={`M ${RX} ${TY} L ${RX + DX} ${TY - DY} L ${RX + DX} ${BY - DY} L ${RX} ${BY} Z`}
              fill="#2A1F14" />
            {/* Spine */}
            <rect x={SX} y={TY} width={SW} height={BY - TY} rx="1.5" fill="#3D2B1F" />
            {/* Body */}
            <rect x={BX} y={TY} width={RX - BX} height={BY - TY} rx="1.5" fill="#6B4C35" />
            {/* Lines */}
            {[28, 38, 48, 58, 68, 78].map(y => (
              <line key={y} x1={BX + 6} y1={y} x2={RX - 4} y2={y}
                stroke="#F5EDD8" strokeWidth="2.5" />
            ))}
            {/* Bottom 3D */}
            <path d={`M ${SX} ${BY} L ${SX + DX} ${BY - DY + DX} L ${RX + DX} ${BY - DY + DX} L ${RX} ${BY} Z`}
              fill="#2A1F14" />
          </g>

          {/* ── LAYER 2: Colored filled book (clipped to progress) ── */}
          <g clipPath={`url(#fc-${uid})`}>
            {/* 3D top face */}
            <path d={`M ${SX} ${TY} L ${SX + DX} ${TY - DY} L ${RX + DX} ${TY - DY} L ${RX} ${TY} Z`}
              fill={dim3DColor} />
            {/* 3D right face */}
            <path d={`M ${RX} ${TY} L ${RX + DX} ${TY - DY} L ${RX + DX} ${BY - DY} L ${RX} ${BY} Z`}
              fill={dim3DColor} />
            {/* Spine */}
            <rect x={SX} y={TY} width={SW} height={BY - TY} rx="1.5" fill={spineColor} />
            {/* Spine decorations */}
            <rect x={SX + 2} y={TY + 8} width={SW - 4} height="2.5" rx="1" fill="#F5EDD8" opacity="0.65" />
            <rect x={SX + 2} y={TY + 38} width={SW - 4} height="2.5" rx="1" fill="#F5EDD8" opacity="0.65" />
            {/* Body */}
            <rect x={BX} y={TY} width={RX - BX} height={BY - TY} rx="1.5" fill={fillColor} />
            {/* Page lines */}
            {[28, 38, 48, 58, 68, 78].map(y => (
              <line key={y} x1={BX + 7} y1={y} x2={RX - 5} y2={y}
                stroke="#FDFAF4" strokeWidth="1.5" opacity="0.55" />
            ))}
            {/* Bottom 3D */}
            <path d={`M ${SX} ${BY} L ${SX + DX} ${BY - DY + DX} L ${RX + DX} ${BY - DY + DX} L ${RX} ${BY} Z`}
              fill={dim3DColor} />
          </g>

          {/* ── LAYER 3: Outlines (always visible on top) ── */}
          {/* 3D top */}
          <path d={`M ${SX} ${TY} L ${SX + DX} ${TY - DY} L ${RX + DX} ${TY - DY} L ${RX} ${TY} Z`}
            fill="none" stroke="#3D2B1F" strokeWidth="1.8" strokeLinejoin="round" />
          {/* 3D right */}
          <path d={`M ${RX} ${TY} L ${RX + DX} ${TY - DY} L ${RX + DX} ${BY - DY} L ${RX} ${BY} Z`}
            fill="none" stroke="#3D2B1F" strokeWidth="1.8" strokeLinejoin="round" />
          {/* Spine outline */}
          <rect x={SX} y={TY} width={SW} height={BY - TY} rx="1.5"
            fill="none" stroke="#3D2B1F" strokeWidth="2" />
          {/* Body outline */}
          <rect x={BX} y={TY} width={RX - BX} height={BY - TY} rx="1.5"
            fill="none" stroke="#3D2B1F" strokeWidth="2" />
          {/* Bottom 3D */}
          <path d={`M ${SX} ${BY} L ${SX + DX} ${BY - DY + DX} L ${RX + DX} ${BY - DY + DX} L ${RX} ${BY} Z`}
            fill="none" stroke="#3D2B1F" strokeWidth="1.8" strokeLinejoin="round" />

          {/* ── BOOKMARK (ribbon on spine top) ── */}
          <path
            d={`M ${SX + 3} ${TY - DY + 1}
               L ${SX + 3} ${TY + 20}
               L ${SX + 7} ${TY + 15}
               L ${SX + 11} ${TY + 20}
               L ${SX + 11} ${TY - DY + 1} Z`}
            fill={pct > 0 ? '#C9A84C' : '#D4B896'}
            stroke={pct > 0 ? '#8B6914' : '#9B7355'}
            strokeWidth="1"
            strokeLinejoin="round"
          />

          {/* ── PROGRESS % text in center ── */}
          {pct > 0 && pct < 100 && (
            <text
              x={(BX + RX) / 2}
              y="52"
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill={pct > 40 ? '#FDFAF4' : '#3D2B1F'}
              fontFamily="Cairo, sans-serif"
              opacity="0.85"
            >
              {pct}٪
            </text>
          )}

          {/* ── CHECKMARK when completed ── */}
          {completed && (
            <>
              <circle cx={(BX + RX) / 2} cy="50" r="16"
                fill="#3D2B1F" opacity="0.75" />
              <text x={(BX + RX) / 2} y="57" textAnchor="middle"
                fontSize="18" fill="#C9A84C" fontWeight="bold">
                ✓
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Label & milestone */}
      <div className="text-center w-full">
        <p className="text-xs font-bold text-brown-dark leading-tight truncate px-1">{label}</p>
        <p className={`text-xs font-semibold mt-0.5 ${
          completed
            ? 'text-gold-dark'
            : pct >= 50
            ? 'text-brown'
            : pct > 0
            ? 'text-brown-light'
            : 'text-brown-xlight'
        }`}>
          {getMilestoneLabel(pct)}
        </p>
        <p className="text-xs text-brown-xlight">{current}/{max} {unit}</p>
      </div>
    </div>
  )
}
