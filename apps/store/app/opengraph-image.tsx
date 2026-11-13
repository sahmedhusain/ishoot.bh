import { ImageResponse } from "next/og";
import { getSite } from "../lib/site";

export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const { company } = await getSite();
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: 80,
        background: "white",
        color: "#171717",
        borderBottom: `24px solid ${company.theme.primary}`,
      }}
    >
      <div style={{ display: "flex", fontSize: 72, fontWeight: 700 }}>
        {company.company_name_en}
      </div>
      {company.tagline_en ? (
        <div style={{ display: "flex", fontSize: 32, marginTop: 32 }}>
          {company.tagline_en}
        </div>
      ) : null}
    </div>,
    size,
  );
}
