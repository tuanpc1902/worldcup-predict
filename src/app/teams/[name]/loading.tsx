export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-40 bg-white rounded-2xl border border-slate-200" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-16 bg-white rounded-xl border border-slate-200" />
      ))}
    </div>
  )
}
