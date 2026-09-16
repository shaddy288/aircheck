export default function ActionBar({
  rows,
  selected,
  setSelected,
  onSearch,
  onBulkDownload,
}) {
  const allSelected =
    rows.length > 0 && selected.length === rows.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected([]);
      return;
    }

    setSelected(rows.map((row) => row.id));
  };

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">

      <button
        type="button"
        onClick={onSearch}
        className="rounded-md border border-[#237d70] bg-[#2f9e8f] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#237d70]"
      >
        Search
      </button>

      <label className="flex cursor-pointer items-center gap-2 text-sm">

        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="h-4 w-4 accent-[#2f9e8f]"
        />

        Select all

      </label>

      <button
        type="button"
        onClick={onBulkDownload}
        className="rounded-md border border-[#2f9e8f] bg-white px-4 py-2 text-sm font-medium text-[#237d70] transition hover:bg-[#e4f4f1]"
      >
        Bulk download
      </button>

      {selected.length > 0 && (
        <span className="ml-auto text-xs text-[#6b7a80]">
          {selected.length} selected
        </span>
      )}

    </div>
  );
}