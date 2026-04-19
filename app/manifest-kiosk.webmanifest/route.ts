import { NextResponse } from "next/server";

import { buildAppManifest } from "@/lib/pwa/manifest";
import { applySecurityHeaders } from "@/lib/server/security";

export function GET() {
  const response = NextResponse.json(
    buildAppManifest({
      display: "fullscreen",
      startUrl: "/da?kiosk=1",
    }),
    {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
      },
    },
  );

  return applySecurityHeaders(response);
}
