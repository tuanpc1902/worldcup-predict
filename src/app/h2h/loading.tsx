import { SkeletonBox } from '@/components/Skeleton'

export default function H2HLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      <div className="space-y-1">
        <SkeletonBox className="h-8 w-36" />
        <SkeletonBox className="h-4 w-60 rounded-full" />
      </div>
      {/* Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <SkeletonBox className="h-10 rounded-xl" />
          <SkeletonBox className="h-10 rounded-xl" />
        </div>
        <SkeletonBox className="h-10 rounded-xl" />
      </div>
      {/* Results */}
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
            <SkeletonBox className="h-4 flex-1 rounded" />
            <SkeletonBox className="h-8 w-20 rounded-lg" />
            <SkeletonBox className="h-4 flex-1 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
