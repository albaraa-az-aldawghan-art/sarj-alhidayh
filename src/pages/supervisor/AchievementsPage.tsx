import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, ImagePlus, X, Award } from 'lucide-react'
import toast from 'react-hot-toast'
import { subscribeAchievements, uploadAchievementImage, addAchievement, deleteAchievement } from '../../firebase/db'
import type { Achievement } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const MAX_DESC = 300

export default function AchievementsPage() {
  const { user } = useAuth()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [description, setDescription] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const unsub = subscribeAchievements(items => {
      setAchievements(items)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side type check
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      toast.error('يُقبل فقط: JPG، PNG، WebP، GIF')
      e.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5MB')
      e.target.value = ''
      return
    }
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const resetForm = () => {
    setShowForm(false)
    setDescription('')
    setPreview(null)
    setSelectedFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!selectedFile) return toast.error('يرجى اختيار صورة')
    if (!description.trim()) return toast.error('يرجى كتابة وصف الإنجاز')
    if (description.length > MAX_DESC) return toast.error(`الوصف يجب أن يكون أقل من ${MAX_DESC} حرف`)

    setUploading(true)
    try {
      const { url, path } = await uploadAchievementImage(selectedFile)
      await addAchievement({
        imageUrl: url,
        imagePath: path,
        description: description.trim(),
        supervisorId: user!.id,
        supervisorName: user!.name,
        createdAt: new Date(),
      })
      toast.success('تم إضافة الإنجاز')
      resetForm()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'حدث خطأ أثناء الرفع')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (a: Achievement) => {
    if (!confirm(`هل تريد حذف هذا الإنجاز؟`)) return
    try {
      await deleteAchievement(a.id, a.imagePath)
      toast.success('تم الحذف')
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  if (loading) return <div className="flex justify-center p-20"><LoadingSpinner size="lg" text="جاري التحميل..." /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="section-title mb-0">إنجازات المستوى</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" /> إضافة إنجاز
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="card border-2 border-gold-light">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-brown-dark text-lg flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-gold" /> إضافة إنجاز جديد
            </h2>
            <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-sand-light text-brown-light">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Image picker */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl cursor-pointer transition-colors mb-4 overflow-hidden
              ${preview ? 'border-gold-light' : 'border-sand hover:border-gold-light'}`}
          >
            {preview ? (
              <img src={preview} alt="معاينة" className="w-full max-h-64 object-contain bg-sand-light" />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-brown-light gap-2">
                <ImagePlus className="h-10 w-10" />
                <p className="font-semibold text-sm">اضغط لاختيار صورة</p>
                <p className="text-xs">JPG، PNG، WebP، GIF — الحد الأقصى 5MB</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {preview && (
            <button
              onClick={() => { setPreview(null); setSelectedFile(null); if (fileRef.current) fileRef.current.value = '' }}
              className="text-xs text-red-500 hover:text-red-700 mb-3 flex items-center gap-1"
            >
              <X className="h-3 w-3" /> تغيير الصورة
            </button>
          )}

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-brown mb-1.5">
              وصف الإنجاز
              <span className="text-xs font-normal text-brown-light mr-2">({description.length}/{MAX_DESC})</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, MAX_DESC))}
              placeholder="اكتب ما أنجزه المستوى..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={uploading || !selectedFile || !description.trim()}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><LoadingSpinner size="sm" /> جاري الرفع...</>
              ) : (
                <><Plus className="h-4 w-4" /> حفظ الإنجاز</>
              )}
            </button>
            <button onClick={resetForm} className="btn-secondary flex-1">إلغاء</button>
          </div>
        </div>
      )}

      {/* Achievements grid */}
      {achievements.length === 0 ? (
        <div className="card text-center py-14">
          <Award className="h-14 w-14 text-sand mx-auto mb-3" />
          <p className="text-brown-light text-lg font-semibold mb-1">لا يوجد إنجازات بعد</p>
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2 mt-4">
            <Plus className="h-4 w-4" /> أضف أول إنجاز
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {achievements.map(a => (
            <div key={a.id} className="card p-0 overflow-hidden border border-sand-light">
              <div className="relative">
                <img
                  src={a.imageUrl}
                  alt="إنجاز"
                  className="w-full max-h-72 object-contain bg-sand-light"
                  loading="lazy"
                />
                <button
                  onClick={() => handleDelete(a)}
                  className="absolute top-2 left-2 p-2 rounded-xl bg-red-600/90 text-white hover:bg-red-700 transition-colors"
                  title="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-brown-dark font-semibold leading-relaxed">{a.description}</p>
                <p className="text-xs text-brown-light mt-2">{a.supervisorName}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
