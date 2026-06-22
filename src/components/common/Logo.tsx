interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
}

export default function Logo({ size = 'md', showText = true }: Props) {
  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-44 h-44',
  }
  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src="/logo.jpeg"
        alt="سرج الهداية"
        className={`${sizes[size]} rounded-full object-cover shadow-md`}
      />
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
