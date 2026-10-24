import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export function categoryOg({
  category,
  leader,
  badge,
  others,
  updated,
}: {
  category: string;
  leader: string;
  badge: string;
  others: string;
  updated: string;
}) {
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
        <div style={{ fontSize: 32, marginTop: 28, color: "#d4d4d8" }}>{category}</div>
        <div style={{ fontSize: 64, fontWeight: 700, marginTop: 16, lineHeight: 1.1 }}>{leader}</div>
        <div style={{ display: "flex", marginTop: 28 }}>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: "#6ee7b7",
              background: "#064e3b",
              borderRadius: 999,
              padding: "8px 18px",
            }}
          >
            {badge}
          </div>
        </div>
        <div style={{ fontSize: 26, marginTop: 28, color: "#d4d4d8" }}>{others}</div>
        <div style={{ fontSize: 22, marginTop: 16, color: "#a1a1aa" }}>{updated}</div>
      </div>
    ),
    { ...ogSize },
  );
}

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
