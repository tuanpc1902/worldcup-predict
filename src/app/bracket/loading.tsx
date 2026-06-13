import { SkeletonBox } from '@/components/Skeleton'

function MatchSlotSkeleton() {
  return (
    <div className="w-36 bg-white rounded-xl border border-slate-200 overflow-hidden">
      {[0, 1].map(i => (
        <div key={i} className={`flex items-center gap-2 px-3 py-2 ${i === 0 ? 'border-b border-slate-100' : ''}`}>
          <SkeletonBox className="w-5 h-4 rounded flex-shrink-0" />
          <SkeletonBox className="h-3 flex-1 rounded" />
        </div>
      ))}
    </div>
  )
}

export default function BracketLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <SkeletonBox className="h-8 w-44" />
        <SkeletonBox className="h-4 w-56 rounded-full" />
      </div>
      <div className="overflow-x-auto pb-6">
        <div className="flex items-start gap-12 min-w-max pt-2">
          {[8, 4, 2, 1].map((count, col) => (
            <div key={col} className="flex flex-col gap-6 items-center">
              <SkeletonBox className="h-5 w-24 rounded-full mb-2" />
              {[...Array(count)].map((_, i) => <MatchSlotSkeleton key={i} />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
