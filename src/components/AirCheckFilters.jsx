import TimeBandSlider from "./TimeBandSlider";
import ActionBar from "./ActionBar";

const locations = [
  "Agartala",
  "Guwahati",
  "Shillong",
  "Imphal",
];

const inputClass =
  "w-full rounded-md border border-[#dbe3e2] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2f9e8f] focus:ring-2 focus:ring-[#2f9e8f]/20";

export default function AirCheckFilters({
  filters,
  onChange,
  onSearch,
  rows,
  selected,
  setSelected,
  onBulkDownload,
}) {
  return (
    <section className="rounded-xl border border-[#dbe3e2] bg-white p-5 shadow-sm">
      {/* Location + Date Range */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Location */}
        <div>
          <label className="mb-1 block text-xs font-medium">
            Location
          </label>

          <select
            value={filters.location}
            onChange={(e) => onChange("location", e.target.value)}
            className={inputClass}
          >
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        {/* From Date */}
        <div>
          <label className="mb-1 block text-xs font-medium">
            From date and time
          </label>

          <input
            type="datetime-local"
            value={filters.fromDate}
            onChange={(e) => onChange("fromDate", e.target.value)}
            className={inputClass}
          />
        </div>

        {/* To Date */}
        <div>
          <label className="mb-1 block text-xs font-medium">
            To date and time
          </label>

          <input
            type="datetime-local"
            value={filters.toDate}
            onChange={(e) => onChange("toDate", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Time Band */}
      {/* <TimeBandSlider
        start={filters.timeStart}
        end={filters.timeEnd}
        onStartChange={(value) => onChange("timeStart", value)}
        onEndChange={(value) => onChange("timeEnd", value)}
      /> */}

      {/* Actions */}
      <ActionBar
        rows={rows}
        selected={selected}
        setSelected={setSelected}
        onSearch={onSearch}
        onBulkDownload={onBulkDownload}
      />
    </section>
  );
}