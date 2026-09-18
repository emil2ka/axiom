const NAMES = [
  "RWTH Aachen",
  "TU Delft",
  "University of Oxford",
  "ETH Zürich",
  "Charles University",
  "Aalto University",
  "UPC Barcelona",
  "University of Cambridge",
  "Warsaw University of Technology",
  "BME Budapest",
  "University of Warsaw",
];

export function UniversityMarquee() {
  const row = [...NAMES, ...NAMES];
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden border-y border-line-soft py-5"
      style={{
        maskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
      }}
    >
      <div className="flex w-max animate-marquee items-center gap-10">
        {row.map((name, index) => (
          <span key={`${name}-${index}`} className="flex items-center gap-10">
            <span className="whitespace-nowrap text-[11px] uppercase tracking-[0.22em] text-mist-600 transition-colors hover:text-mist-300">
              {name}
            </span>
            <span className="h-1 w-1 rounded-full bg-line" />
          </span>
        ))}
      </div>
    </div>
  );
}
