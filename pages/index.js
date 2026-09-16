import { useState } from "react";
import AirCheckHeader from "../src/components/AirCheckHeader";
import AirCheckFilters from "../src/components/AirCheckFilters";
import ResultsTable from "../src/components/ResultsTable";

const sampleData = [
  {
    id: 1,
    ts: "2026-08-01 00:15",
    loc: "Agartala",
    file: "agartala_0015.mp3",
    audioUrl: "/audio/dummy_Data.mp3",
    status: "ok",
  },
  {
    id: 2,
    ts: "2026-08-01 03:30",
    loc: "Agartala",
    file: "agartala_0330.mp3",
    audioUrl: "/audio/dummy_Data.mp3",
    status: "processing",
  },
];

export default function AirCheckPage() {
  const [rows, setRows] = useState(sampleData);
  const [selected, setSelected] = useState([]);

  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    location: "Agartala",
    timeStart: 0,
    timeEnd: 24,
  });

  const handleFilterChange = (name, value) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /*
   * Client-side filtering over the sample dataset, standing in
   * for a real API call. Swap the body of this function for a
   * fetch() to your backend once it's ready — `filters` already
   * has everything a query needs (location, date range, time band).
   */
  const handleSearch = async () => {
    const filtered = sampleData.filter((row) => {
      if (filters.location && row.loc !== filters.location) {
        return false;
      }

      const rowDate = new Date(row.ts.replace(" ", "T"));

      if (filters.fromDate && rowDate < new Date(filters.fromDate)) {
        return false;
      }

      if (filters.toDate && rowDate > new Date(filters.toDate)) {
        return false;
      }

      const rowHour = rowDate.getHours() + rowDate.getMinutes() / 60;

      if (rowHour < filters.timeStart || rowHour > filters.timeEnd) {
        return false;
      }

      return true;
    });

    setRows(filtered);
    setSelected([]);
  };

  const handleDownload = (row) => {
    const link = document.createElement("a");

    link.href = row.audioUrl;
    link.download = row.file;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkDownload = () => {
    if (!selected.length) {
      alert("Select at least one record to bulk download.");
      return;
    }

    const selectedRows = rows.filter((row) => selected.includes(row.id));

    // API/archive step will be connected here later; for now,
    // download each selected file individually.
    selectedRows.forEach((row) => handleDownload(row));
  };

  return (
    <main className="min-h-screen bg-[#eef2f1] px-4 py-8 text-[#1f2a2e]">
      <div className="mx-auto">
        <AirCheckHeader />

        <AirCheckFilters
          filters={filters}
          onChange={handleFilterChange}
          onSearch={handleSearch}
          rows={rows}
          selected={selected}
          setSelected={setSelected}
          onBulkDownload={handleBulkDownload}
        />

        <ResultsTable
          rows={rows}
          selected={selected}
          setSelected={setSelected}
          onDownload={handleDownload}
        />
      </div>
    </main>
  );
}