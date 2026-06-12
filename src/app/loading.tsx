import { MatchCardSkeleton } from '@/components/Skeleton'
import SpinFlag from '@/components/SpinFlag'

export default function HomeLoading() {
  return (
    <div className="space-y-8">
      {/* Hero skeleton with spinning flag */}
      <div
        className="h-44 rounded-2xl flex flex-col items-center justify-center gap-3"
        style={{ background: 'var(--brand)' }}
      >
        <SpinFlag size={56} />
        <p className="text-white/60 text-sm font-medium">Đang tải...</p>
      </div>

      <section className="space-y-3">
        <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => <MatchCardSkeleton key={i} />)}
        </div>
      </section>
    </div>
  )
}
