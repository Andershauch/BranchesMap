import { NextResponse } from "next/server";

import { utf8SmokeSamples } from "@/lib/utf8-smoke";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "UTF-8 virker for danske tegn: æ, ø, å, Æ, Ø, Å.",
    samples: utf8SmokeSamples,
  });
}
