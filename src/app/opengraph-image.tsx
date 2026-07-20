import { ImageResponse } from "next/og";

export const alt = "LunchSpecial";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 80px",
          background: "linear-gradient(135deg, #ea580c 0%, #9a3412 100%)",
        }}
      >
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "#ffffff" }}>LunchSpecial</div>
        <div style={{ display: "flex", fontSize: 34, color: "#f3f4f6", marginTop: 24 }}>
          Lunch specials near you, crowdsourced
        </div>
      </div>
    ),
    { ...size }
  );
}
