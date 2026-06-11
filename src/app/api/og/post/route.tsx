import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const SIZES: Record<string, { width: number; height: number }> = {
  instagram: { width: 1080, height: 1080 },
  twitter: { width: 1200, height: 675 },
  linkedin: { width: 1200, height: 627 },
  facebook: { width: 1200, height: 630 },
  pinterest: { width: 1000, height: 1500 },
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get("title") ?? "Your Post";
  const brand = searchParams.get("brand") ?? "Brand";
  const tagline = searchParams.get("tagline") ?? "";
  const color = `#${(searchParams.get("color") ?? "d97706").replace("#", "")}`;
  const platform = searchParams.get("platform") ?? "instagram";
  const domain = searchParams.get("domain") ?? "";
  const path = searchParams.get("path") ?? "";

  const size = SIZES[platform] ?? SIZES.instagram;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `linear-gradient(135deg, ${color} 0%, #134e4a 50%, #0f172a 100%)`,
          padding: 64,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: 700,
                color: "white",
              }}
            >
              {brand.charAt(0).toUpperCase()}
            </div>
            <span
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {brand}
            </span>
          </div>

          <h1
            style={{
              fontSize: size.width > 1000 && size.height > 1000 ? 56 : 48,
              fontWeight: 800,
              color: "white",
              lineHeight: 1.15,
              margin: 0,
              maxWidth: "90%",
            }}
          >
            {title}
          </h1>

          {tagline && (
            <p
              style={{
                fontSize: 24,
                color: "rgba(255,255,255,0.75)",
                margin: 0,
                maxWidth: "85%",
                lineHeight: 1.4,
              }}
            >
              {tagline}
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <span
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            {domain}
            {path && path !== "/" ? path : ""}
          </span>
          <span
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.4)",
              fontWeight: 500,
            }}
          >
            crawlspark.ai
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}