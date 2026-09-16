import { Fragment, useState } from "react";
import AudioEditor from "./AudioEditor";
import StatusBadge from "./StatusBadge";

export default function ResultsTable({
  rows,
  selected,
  setSelected,
  onDownload,
}) {
  const [expandedId, setExpandedId] = useState(null);

  const toggleRow = (id) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const toggleExpand = (id) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <section className="mt-4 rounded-xl border border-[#dbe3e2] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Available recordings</h2>

        <span className="text-xs text-[#6b7a80]">
          {rows.length} {rows.length === 1 ? "recording" : "recordings"}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-[#6b7a80]">
          No recordings found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Available air check recordings</caption>

            <thead>
              <tr className="border-b border-[#dbe3e2] bg-[#f7f9f8] text-left text-xs uppercase tracking-wide text-[#6b7a80]">
                <th className="w-10 px-3 py-3" scope="col" />
                <th className="px-3 py-3" scope="col">Timestamp</th>
                <th className="px-3 py-3" scope="col">Location</th>
                <th className="px-3 py-3" scope="col">Status</th>
                <th className="px-3 py-3" scope="col">Audio Editor</th>
                <th className="px-3 py-3 text-right" scope="col">File</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const isExpanded = expandedId === row.id;

                return (
                  <Fragment key={row.id}>
                    <tr
                      className="border-b border-[#eef1f0] align-top hover:bg-[#f9fbfa]"
                    >
                      <td className="px-3 py-4">
                        <input
                          type="checkbox"
                          checked={selected.includes(row.id)}
                          onChange={() => toggleRow(row.id)}
                          aria-label={`Select recording ${row.file}`}
                          className="h-4 w-4 accent-[#2f9e8f]"
                        />
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 font-mono text-xs">
                        {row.ts}
                      </td>

                      <td className="px-3 py-4">{row.loc}</td>

                      <td className="px-3 py-4">
                        <StatusBadge status={row.status} />
                      </td>

                      <td className="px-3 py-4">
                        <button
                          type="button"
                          onClick={() => toggleExpand(row.id)}
                          aria-expanded={isExpanded}
                          className="text-xs font-medium text-[#237d70] hover:underline"
                        >
                          {isExpanded ? "Hide editor" : "Open editor"}
                        </button>
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => onDownload(row)}
                          className="text-xs font-medium text-[#237d70] hover:underline"
                        >
                          Original MP3
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="border-b border-[#eef1f0] bg-[#fafcfb]">
                        <td colSpan={6} className="px-3 py-4">
                          <AudioEditor
                            audioUrl={row.audioUrl}
                            fileName={row.file}
                            onCutDownload={(data) => {
                              console.log("CUT DATA:", data);
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}