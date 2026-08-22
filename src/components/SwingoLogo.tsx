import logoAsset from "@/assets/swingo-logo.png.asset.json";

export function SwingoMark({
  className = "",
  spinning = false,
  style,
}: {
  className?: string;
  spinning?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <img
      src={logoAsset.url}
      alt="Swingo logo"
      draggable={false}
      className={`select-none object-contain ${spinning ? "animate-spin-slow" : ""} ${className}`}
      style={style}
    />
  );
}

/** Main app logo — exact 3cm height x 2cm width as specified. */
export function SwingoAppLogo() {
  return <SwingoMark style={{ height: "3cm", width: "2cm" }} />;
}

/** Swingo Live button logo: audio waveform bars with the letter S. */
export function SwingoLiveMark({ active = false, size = 22 }: { active?: boolean; size?: number }) {
  const bars = [0.45, 0.85, 1, 0.7, 0.5];
  return (
    <span
      className="flex items-end justify-center gap-[2px]"
      style={{ height: size, width: size }}
      aria-hidden
    >
      {bars.map((h, i) => (
        <span
          key={i}
          className={`w-[2px] rounded-full bg-current ${active ? "animate-wave" : ""}`}
          style={{
            height: `${h * 100}%`,
            animationDelay: `${i * 0.09}s`,
          }}
        />
      ))}
      <span className="absolute font-display text-[10px] font-bold tracking-tight opacity-0">S</span>
    </span>
  );
}

export function SwingoLiveButtonIcon({ active = false }: { active?: boolean }) {
  return (
    <span className="relative flex h-6 w-6 items-center justify-center">
      <SwingoLiveMark active={active} size={20} />
      <span className="pointer-events-none absolute font-display text-[11px] font-extrabold leading-none">
        S
      </span>
    </span>
  );
}
