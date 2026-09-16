export default function AirCheckHeader({ stationCount }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          Air Check Data
        </h1>

        <p className="mt-1 text-sm text-[#6b7a80]">
          Query recorded readings by date, time band and location
        </p>
      </div>

      <span className="rounded-md border border-[#bfe2da] bg-[#e4f4f1] px-3 py-1 font-mono text-xs text-[#237d70]">
        {stationCount} stations online
      </span>
    </div>
  );
}