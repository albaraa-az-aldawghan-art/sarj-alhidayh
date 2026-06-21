import { QRCodeSVG } from 'qrcode.react'
import { Download, Globe, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

export default function QRCodePage() {
  const publicUrl = `${window.location.origin}/public`

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl)
    toast.success('تم نسخ الرابط')
  }

  const handleDownload = () => {
    const svg = document.getElementById('public-qr')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sarj-alhidaya-qr.svg'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('تم تنزيل الباركود')
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="section-title">باركود الإحصائيات العامة</h1>

      <div className="card text-center">
        <p className="text-brown mb-6 text-sm">
          هذا الباركود ثابت يمكن لأي شخص مسحه لرؤية إحصائيات المركز بدون تسجيل دخول
        </p>

        <div className="flex justify-center mb-6">
          <div className="p-6 bg-parchment rounded-2xl shadow-inner border-2 border-sand-light">
            <QRCodeSVG
              id="public-qr"
              value={publicUrl}
              size={220}
              bgColor="#FDFAF4"
              fgColor="#3D2B1F"
              level="H"
              includeMargin={true}
            />
          </div>
        </div>

        <div className="bg-cream rounded-xl p-3 mb-5 flex items-center gap-2">
          <Globe className="h-4 w-4 text-brown-light flex-shrink-0" />
          <p className="text-sm text-brown truncate flex-1 text-right">{publicUrl}</p>
          <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-sand-light text-brown transition-colors flex-shrink-0">
            <Copy className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-3">
          <button onClick={handleDownload} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Download className="h-5 w-5" /> تنزيل الباركود
          </button>
          <button
            onClick={() => window.open('/public', '_blank')}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <Globe className="h-5 w-5" /> فتح الصفحة
          </button>
        </div>
      </div>

      <div className="card bg-gold-xlight border border-gold-light">
        <h3 className="font-bold text-brown-dark mb-2">ماذا يرى الزوار؟</h3>
        <ul className="space-y-1.5 text-sm text-brown">
          <li className="flex items-center gap-2"><span className="text-gold">•</span> عدد الطلاب المتواجدين اليوم وإجمالاً</li>
          <li className="flex items-center gap-2"><span className="text-gold">•</span> عدد صفحات القرآن المحفوظة</li>
          <li className="flex items-center gap-2"><span className="text-gold">•</span> عدد الأبيات المحفوظة</li>
          <li className="flex items-center gap-2"><span className="text-gold">•</span> عدد المتون المكتملة</li>
          <li className="flex items-center gap-2"><span className="text-gold">•</span> مثالي الأسبوع وحافظ الأسبوع</li>
          <li className="flex items-center gap-2"><span className="text-gold">•</span> جوائز الأسابيع السابقة</li>
        </ul>
      </div>
    </div>
  )
}
