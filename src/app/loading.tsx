import { MatchCardSkeleton } from '@/components/Skeleton'

export default function HomeLoading() {
  return (
    <div className="space-y-8">
      <div className="h-44 bg-green-600 rounded-2xl animate-pulse" />
      <section className="space-y-3">
        <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => <MatchCardSkeleton key={i} />)}
        </div>
      </section>
    </div>
  )
}
