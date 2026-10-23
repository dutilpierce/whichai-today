import { ImageResponse } from "next/og";
import models from "@/lib/models.json";

export const alt =
  "WhichAI.today: find the best AI model for the job.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const leaders = Object.values(models.categories);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#09090b",
          color: "#fafafa",
          padding: "64px",
        }}
      >
        <div style={{ fontSize: 28, color: "#34d399" }}>WhichAI.today</div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            marginTop: 20,
            lineHeight: 1.15,
            maxWidth: 980,
          }}
        >
          Find the best AI model for the job.
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            marginTop: 40,
            gap: 18,
          }}
        >
          {leaders.map((category) => (
            <div
              key={category.display_name}
              style={{ display: "flex", flexDirection: "column", width: 330 }}
            >
              <div style={{ fontSize: 18, color: "#a1a1aa" }}>
                {category.display_name}
              </div>
              <div style={{ fontSize: 24, marginTop: 4 }}>
                {category.leader.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
