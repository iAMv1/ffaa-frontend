export function money(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)
}

export function statusClass(s: string) {
  if (s === 'approved' || s === 'sent') return 'bg-emerald-50 text-emerald-800 ring-emerald-600/15'
  if (s === 'reviewed' || s === 'pending') return 'bg-zinc-100 text-zinc-700 ring-zinc-500/10'
  if (s === 'failed') return 'bg-red-50 text-red-800 ring-red-600/15'
  return 'bg-amber-50 text-amber-900 ring-amber-600/15'
}

export function SkeletonRows({ n = 4 }: { n?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="skeleton h-10 rounded-lg" style={{ opacity: 1 - i * 0.1 }} />
      ))}
    </div>
  )
}

export function EmptyHint({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-start gap-1 px-5 py-14">
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      <p className="max-w-[40ch] text-sm leading-relaxed text-zinc-500">{body}</p>
    </div>
  )
}
