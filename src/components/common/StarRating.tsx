interface Props {
  stars: number   // 0 | 0.5 | 1 | 1.5 | 2
  max?: number    // default 2
  size?: number   // px, default 20
  flipHalf?: boolean  // flip which side is filled (for gold backgrounds)
}

function Star({ fill, size, flipHalf }: { fill: 'full' | 'half' | 'empty'; size: number; flipHalf?: boolean }) {
  const id = `half-${Math.random().toString(36).slice(2)}`
  const clipX = flipHalf ? "0" : "12"
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {fill === 'half' && (
        <defs>
          <clipPath id={id}>
            <rect x={clipX} y="0" width="12" height="24" />
          </clipPath>
        </defs>
      )}
      {/* Empty background star */}
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill="#E8D5A3"
        stroke="#C9A84C"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Filled part */}
      {(fill === 'full' || fill === 'half') && (
        <polygon
          points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
          fill="#C9A84C"
          stroke="#C9A84C"
          strokeWidth="1.2"
          strokeLinejoin="round"
          clipPath={fill === 'half' ? `url(#${id})` : undefined}
        />
      )}
    </svg>
  )
}

export default function StarRating({ stars, max = 2, size = 20, flipHalf }: Props) {
  const items = Array.from({ length: max }, (_, i) => {
    const rem = stars - i
    if (rem >= 1) return 'full' as const
    if (rem >= 0.5) return 'half' as const
    return 'empty' as const
  })

  return (
    <span className="inline-flex items-center gap-0.5">
      {items.map((fill, i) => (
        <Star key={i} fill={fill} size={size} flipHalf={flipHalf} />
      ))}
    </span>
  )
}
