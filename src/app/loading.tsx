export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="h-7 w-2/3 rounded bg-bg-hover" />
        <div className="h-4 w-1/2 rounded bg-bg-hover" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-bg-secondary" />
        ))}
      </div>
      <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-border">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 bg-bg-secondary" />
        ))}
      </div>
    </div>
  );
}
