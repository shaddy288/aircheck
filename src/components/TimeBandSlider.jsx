function formatHour(value) {
  const hour = Math.floor(value);
  const minutes = Math.round((value - hour) * 60);

  return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export default function TimeBandSlider({
  start,
  end,
  onStartChange,
  onEndChange,
}) {
  const handleStartChange = (value) => {
    onStartChange(Math.min(value, end));
  };

  const handleEndChange = (value) => {
    onEndChange(Math.max(value, start));
  };

  return (
    <div className="mt-5">
      <label className="mb-2 block text-xs font-medium">
        Filter by time band
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[#6b7a80]">From</span>

          <input
            type="range"
            min="0"
            max="24"
            step="0.5"
            value={start}
            onChange={(e) => handleStartChange(Number(e.target.value))}
            aria-label="Time band start hour"
            className="w-40 accent-[#2f9e8f]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[#6b7a80]">To</span>

          <input
            type="range"
            min="0"
            max="24"
            step="0.5"
            value={end}
            onChange={(e) => handleEndChange(Number(e.target.value))}
            aria-label="Time band end hour"
            className="w-40 accent-[#2f9e8f]"
          />
        </div>

        <span className="font-mono text-xs">
          {formatHour(start)} – {formatHour(end)}
        </span>
      </div>
    </div>
  );
}