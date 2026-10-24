import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export function ogImage(title: string, subtitle: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#09090b",
          color: "#fafafa",
          padding: "72px",
        }}
      >
        <div style={{ fontSize: 28, color: "#34d399" }}>WhichAI.today</div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            marginTop: 24,
            lineHeight: 1.15,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 28, marginTop: 28, color: "#d4d4d8", maxWidth: 900 }}>
          {subtitle}
        </div>
      </div>
    ),
    { ...ogSize },
  );
}
