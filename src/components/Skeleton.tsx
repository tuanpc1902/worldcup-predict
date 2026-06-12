interface Props { className?: string }

export function SkeletonBox({ className = '' }: Props) {
  return <div className={`bg-slate-200 animate-pulse rounded-xl ${className}`} />
}

export function MatchCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex justify-between">
        <SkeletonBox className="h-4 w-24 rounded-full" />
        <SkeletonBox className="h-4 w-16 rounded-full" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 flex flex-col items-end gap-1.5">
          <SkeletonBox className="h-6 w-8 rounded" />
          <SkeletonBox className="h-4 w-20 rounded" />
        </div>
        <SkeletonBox className="h-10 w-20 rounded-lg" />
        <div className="flex-1 flex flex-col items-start gap-1.5">
          <SkeletonBox className="h-6 w-8 rounded" />
          <SkeletonBox className="h-4 w-20 rounded" />
        </div>
      </div>
    </div>
  )
}

export function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
      <SkeletonBox className="h-4 w-6 rounded" />
      <SkeletonBox className="h-8 w-8 rounded-full" />
      <SkeletonBox className="h-4 flex-1 max-w-[140px] rounded" />
      <SkeletonBox className="h-5 w-12 rounded ml-auto" />
    </div>
  )
}

export function CommentSkeleton() {
  return (
    <div className="flex gap-3">
      <SkeletonBox className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <SkeletonBox className="h-3 w-24 rounded" />
        <SkeletonBox className="h-4 w-full rounded" />
        <SkeletonBox className="h-4 w-3/4 rounded" />
      </div>
    </div>
  )
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-green-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Đang tải...</p>
      </div>
    </div>
  )
}
