import SpinFlag from '@/components/SpinFlag'

export default function HomeLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-sm">
      <SpinFlag size={56} />
      <p className="text-sm text-slate-400 font-medium">Đang tải...</p>
    </div>
  )
}
