export default function StatusBadge({ status }) {
  if (status === "ok") {
    return (
      <span className="rounded-full bg-[#e4f4f1] px-3 py-1 text-xs font-medium text-[#237d70]">
        Ready
      </span>
    );
  }

  return (
    <span className="rounded-full bg-[#fdf1e0] px-3 py-1 text-xs font-medium text-[#c98a2e]">
      Processing
    </span>
  );
}