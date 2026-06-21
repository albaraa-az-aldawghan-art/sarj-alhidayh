interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
}

export default function Logo({ size = 'md', showText = true }: Props) {
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-36 h-36',
  }
  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${sizes[size]} relative`}>
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <radialGradient id="circleGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ECD9B8" />
              <stop offset="100%" stopColor="#D4B896" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="95" fill="url(#circleGrad)" stroke="#C9A84C" strokeWidth="3" />
          {/* Mandala petals */}
          {Array.from({ length: 12 }).map((_, i) => (
            <ellipse
              key={i}
              cx="100" cy="55" rx="8" ry="20"
              fill="none" stroke="#C9A84C" strokeWidth="1.2" opacity="0.5"
              transform={`rotate(${i * 30} 100 100)`}
            />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <ellipse
              key={`inner-${i}`}
              cx="100" cy="68" rx="5" ry="13"
              fill="none" stroke="#8B6914" strokeWidth="1" opacity="0.4"
              transform={`rotate(${i * 45} 100 100)`}
            />
          ))}
          <text
            x="100" y="88"
            textAnchor="middle"
            fontFamily="Amiri, serif"
            fontSize="38"
            fontWeight="bold"
            fill="#3D2B1F"
          >
            سرج
          </text>
          <text
            x="100" y="128"
            textAnchor="middle"
            fontFamily="Amiri, serif"
            fontSize="30"
            fontWeight="bold"
            fill="#3D2B1F"
          >
            الهداية
          </text>
          <line x1="30" y1="160" x2="170" y2="160" stroke="#C9A84C" strokeWidth="1.5" opacity="0.6" />
          <rect x="93" y="155" width="14" height="10" rx="2" fill="none" stroke="#C9A84C" strokeWidth="1.5" opacity="0.8" />
        </svg>
      </div>
      {showText && (
        <div className="text-center">
          <h1 className={`font-amiri font-bold text-brown-dark ${textSizes[size]}`}>سرج الهداية</h1>
          {(size === 'lg' || size === 'xl') && (
            <p className="text-brown text-sm">نظام إدارة نقاط الطلاب</p>
          )}
        </div>
      )}
    </div>
  )
}
