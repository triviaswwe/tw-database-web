// components/Skeletons.js

export function WrestlerGridSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden flex items-center p-4 min-h-[6rem] border border-gray-200 dark:border-zinc-800 rounded shadow-sm bg-gray-100/70 dark:bg-zinc-900/70 animate-pulse"
        >
          <div className="w-16 h-16 rounded-full bg-gray-300 dark:bg-zinc-800 flex-shrink-0" />
          <div className="ml-4 flex-1 space-y-2">
            <div className="h-5 bg-gray-300 dark:bg-zinc-800 rounded w-3/4" />
            <div className="h-3.5 bg-gray-300 dark:bg-zinc-800 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InterpreterGridSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded shadow-sm animate-pulse space-y-2.5"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-gray-200 dark:bg-zinc-800 rounded" />
            <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
          </div>
          <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function StableGridSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center p-4 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded shadow-sm animate-pulse"
        >
          <div className="w-16 h-16 rounded bg-gray-200 dark:bg-zinc-800 flex-shrink-0" />
          <div className="ml-4 flex-1 space-y-2">
            <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EventGridSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center p-4 border border-gray-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 shadow-sm animate-pulse"
        >
          <div className="w-16 h-16 rounded bg-gray-200 dark:bg-zinc-800 flex-shrink-0 mr-4" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 dark:bg-zinc-800 rounded w-4/5" />
            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CalendarSkeleton() {
  const weekdays = [
    { short: "Mon", full: "Monday" },
    { short: "Tue", full: "Tuesday" },
    { short: "Wed", full: "Wednesday" },
    { short: "Thu", full: "Thursday" },
    { short: "Fri", full: "Friday" },
    { short: "Sat", full: "Saturday" },
    { short: "Sun", full: "Sunday" },
  ];

  return (
    <div className="border border-gray-300 dark:border-gray-800 rounded overflow-hidden shadow-sm animate-pulse" aria-busy="true">
      <div className="grid grid-cols-7 bg-gray-200 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-800">
        {weekdays.map((d) => (
          <div
            key={d.full}
            className="py-2 px-1 text-center font-bold text-xs sm:text-sm text-gray-500 dark:text-gray-400 border-r last:border-r-0 border-gray-300 dark:border-gray-800"
          >
            <span className="hidden sm:inline">{d.full}</span>
            <span className="sm:hidden">{d.short}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 35 }).map((_, idx) => (
          <div
            key={idx}
            className={`min-h-[80px] sm:min-h-[110px] md:min-h-[125px] p-2 border-b border-r border-gray-300 dark:border-gray-800 flex flex-col justify-between bg-gray-50/50 dark:bg-zinc-900/30 ${
              (idx + 1) % 7 === 0 ? "border-r-0" : ""
            }`}
          >
            <div className="w-5 h-4 bg-gray-200 dark:bg-zinc-800 rounded" />
            <div className="w-full h-8 bg-gray-200/60 dark:bg-zinc-800/60 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BeltButtonsSkeleton({ count = 8 }) {
  return (
    <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-4 mb-6" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-16 h-11 md:w-20 md:h-13 rounded-xl bg-gray-200 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 animate-pulse"
        />
      ))}
    </div>
  );
}

export function ChampionshipReignDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true">
      {/* Current Champion Card */}
      <div className="p-5 border border-gray-200 dark:border-zinc-800 rounded-xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-between">
        <div className="space-y-2.5 flex-1">
          <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
          <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
        </div>
        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0 ml-4" />
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-3 border border-gray-200 dark:border-zinc-800 rounded-lg bg-gray-50 dark:bg-zinc-900 space-y-2"
          >
            <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-2/3" />
            <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
          </div>
        ))}
      </div>

      {/* Reigns Table Skeleton */}
      <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <div className="h-10 bg-gray-100 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-800" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-12 border-b last:border-b-0 border-gray-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-950 px-4 flex items-center justify-between"
          >
            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/4" />
            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/6" />
            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChampionshipRecordsSkeleton({ count = 5 }) {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true">
      {/* Subtabs skeleton */}
      <div className="flex gap-6 border-b border-gray-200 dark:border-gray-800 pb-2 mb-6">
        <div className="h-6 w-28 bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="h-6 w-28 bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="h-6 w-36 bg-gray-200 dark:bg-zinc-800 rounded" />
      </div>

      {/* Record cards */}
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
            <div className="space-y-2">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-36" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecordsContentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true">
      {/* Sub category tabs */}
      <div className="flex flex-wrap gap-3 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div className="h-8 w-28 bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="h-8 w-32 bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="h-8 w-24 bg-gray-200 dark:bg-zinc-800 rounded" />
      </div>

      {/* Main Table or Card List */}
      <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
        <div className="h-11 bg-gray-100 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 flex items-center justify-between">
          <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/4" />
          <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/6" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-14 border-b last:border-b-0 border-gray-100 dark:border-zinc-800/60 px-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3 w-1/3">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0" />
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
            </div>
            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/6" />
            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/6" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChampionshipDetailSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse" aria-busy="true">
      <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
      <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/4" />
      <div className="flex gap-4 mt-4">
        <div className="h-10 w-24 bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="h-10 w-24 bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="h-10 w-24 bg-gray-200 dark:bg-zinc-800 rounded" />
      </div>
    </div>
  );
}

export function ChampionshipSubpageListSkeleton({ title = "Items" }) {
  return (
    <div className="p-6 space-y-4 animate-pulse" aria-busy="true">
      <div className="h-7 bg-gray-200 dark:bg-zinc-800 rounded w-1/4 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-5 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
        ))}
      </div>
    </div>
  );
}
