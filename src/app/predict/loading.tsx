import { MatchCardSkeleton } from '@/components/Skeleton'

export default function PredictLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <div className="h-8 w-28 bg-slate-200 rounded animate-pulse" />
        <div className="flex gap-2 mt-2">
          {[80, 96, 72].map(w => (
            <div key={w} className={`h-6 w-${w} bg-slate-100 rounded-full animate-pulse`} style={{ width: w }} />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
        {[...Array(5)].map((_, i) => <MatchCardSkeleton key={i} />)}
      </div>
    </div>
  )
}
