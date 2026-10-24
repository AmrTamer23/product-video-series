import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { brand, colors, strings } from "./theme";

/** The product's mark (brand.logo in public/, else its initial) and its wordmark. */
export const Brand = ({ size = 36 }: { size?: number }) => {
  const [first, second = ""] = brand.wordmark ?? [brand.name];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.35, direction: "ltr" }}>
      {brand.logo ? (
        <Img src={staticFile(brand.logo)} style={{ width: size, height: size, borderRadius: size * 0.28 }} />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: size * 0.28,
            background: colors.brand,
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: size * 0.55,
            fontWeight: 700,
          }}
        >
          {brand.name.slice(0, 1)}
        </div>
      )}
      <div style={{ fontSize: size * 0.72, fontWeight: 700, letterSpacing: -0.5 }}>
        <span style={{ color: colors.text }}>{first}</span>
        <span style={{ color: colors.brandLight }}>{second}</span>
      </div>
    </div>
  );
};

const useEnter = (delay: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return { opacity: p, transform: `translateY(${(1 - p) * 26}px)` };
};

const Intro = ({ number, total, title, subtitle, exitAt }: { number: number; total: number; title: string; subtitle: string; exitAt: number }) => {
  const frame = useCurrentFrame();
  const exit = interpolate(frame, [exitAt - 8, exitAt + 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const kicker = useEnter(4);
  const head = useEnter(10);
  const sub = useEnter(18);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: exit }}>
      <div style={{ position: "absolute", top: 80, ...useEnter(0) }}>
        <Brand size={44} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, textAlign: "center" }}>
        <div
          style={{
            ...kicker,
            padding: "10px 26px",
            borderRadius: 999,
            background: colors.brandSoft,
            border: `1px solid rgba(111,155,255,0.35)`,
            color: "#bcd0ff",
            fontSize: 30,
            fontWeight: 500,
          }}
        >
          {strings.kicker(number, total)}
        </div>
        <div style={{ ...head, fontSize: 92, fontWeight: 700, lineHeight: 1.3, maxWidth: 1500 }}>{title}</div>
        <div style={{ ...sub, fontSize: 40, color: colors.muted, fontWeight: 400 }}>{subtitle}</div>
      </div>
    </AbsoluteFill>
  );
};

const Outro = ({ next }: { next: string | null }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const label = useEnter(6);
  const head = useEnter(12);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fadeIn }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center" }}>
        <div style={{ ...label, fontSize: 34, color: colors.muted }}>{next ? strings.nextUp : strings.seriesEnd}</div>
        <div style={{ ...head, fontSize: 80, fontWeight: 700, lineHeight: 1.3 }}>{next ?? strings.seriesEndTitle}</div>
      </div>
      <div style={{ position: "absolute", bottom: 80, ...useEnter(16) }}>
        <Brand size={36} />
      </div>
    </AbsoluteFill>
  );
};

export const Cards = { Intro, Outro };
