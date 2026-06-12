import { LeaderboardRowSkeleton } from '@/components/Skeleton'

export default function LeaderboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="h-36 bg-amber-50 animate-pulse border-b border-slate-100" />
        {[...Array(8)].map((_, i) => <LeaderboardRowSkeleton key={i} />)}
      </div>
    </div>
  )
}
