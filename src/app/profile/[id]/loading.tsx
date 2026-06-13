import { SkeletonBox } from '@/components/Skeleton'

export default function ProfileLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
        <SkeletonBox className="w-16 h-16 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBox className="h-6 w-36 rounded" />
          <SkeletonBox className="h-4 w-24 rounded" />
        </div>
        <SkeletonBox className="h-9 w-20 rounded-lg flex-shrink-0" />
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 text-center space-y-1.5">
            <SkeletonBox className="h-7 w-12 rounded mx-auto" />
            <SkeletonBox className="h-3 w-16 rounded mx-auto" />
          </div>
        ))}
      </div>
      {/* H2H link */}
      <SkeletonBox className="h-14 rounded-xl" />
      {/* Prediction history */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <SkeletonBox className="h-5 w-44 rounded" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
            <SkeletonBox className="h-4 flex-1 rounded" />
            <SkeletonBox className="h-6 w-14 rounded-lg flex-shrink-0" />
            <SkeletonBox className="h-5 w-10 rounded flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
