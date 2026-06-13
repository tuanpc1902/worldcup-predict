import { SkeletonBox } from '@/components/Skeleton'

export default function ChampionLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="space-y-1">
        <SkeletonBox className="h-8 w-52" />
        <SkeletonBox className="h-4 w-72 rounded-full" />
      </div>
      {/* Search bar */}
      <SkeletonBox className="h-11 w-full rounded-xl" />
      {/* Conf filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {[60, 72, 88, 64, 56, 48].map((w, i) => (
          <div key={i} className="h-7 bg-slate-100 rounded-full animate-pulse" style={{ width: w }} />
        ))}
      </div>
      {/* Team grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="h-14 bg-white rounded-xl border border-slate-200 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
