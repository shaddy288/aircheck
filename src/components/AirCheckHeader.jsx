function LogoMark() {
  return (
    <div className="flex items-center gap-2">
      <img src="https://www.radiocity.in/rc-new/images/RC-logonew.png" alt="AirCheck Logo" />

      {/*
        Swap this whole LogoMark function for an <img src="/logo.png" .../>
        once you have a real logo file — everything else in the header
        layout below stays the same.
      */}
      <span className="text-lg font-bold tracking-tight text-[#1f2a2e]">
        Airs<span className="text-[#237d70]">Check</span>
      </span>
    </div>
  );
}

export default function AirCheckHeader({ stationCount }) {
  return (
    <div className="mb-5 grid grid-cols-1 items-center gap-3 md:grid-cols-3">
      {/* Left: intentionally empty, balances the grid */}
      <div className="hidden md:block" />

      {/* Center: logo */}
      <div className="flex justify-center">
        <LogoMark />
      </div>
    </div>
  );
}