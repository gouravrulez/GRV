import { ImageResponse } from "next/og";

export const alt = "KAOMA — Desire, beauty and connection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#fffaf2 0%,#f4d9df 58%,#7b183d 100%)", color: "#4d1830", fontFamily: "serif" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 70 }}>
        <div style={{ fontSize: 105, letterSpacing: 22 }}>KAOMA</div>
        <div style={{ width: 220, height: 3, background: "#c24a6b", margin: "24px 0" }} />
        <div style={{ fontSize: 34, letterSpacing: 9 }}>DESIRE · BEAUTY · CONNECTION</div>
        <div style={{ fontSize: 26, marginTop: 34, fontFamily: "sans-serif" }}>Private, inclusive shopping for adults worldwide</div>
      </div>
    </div>,
    size,
  );
}
