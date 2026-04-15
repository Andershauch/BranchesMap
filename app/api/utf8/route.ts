import { utf8SmokeSamples } from "@/lib/utf8-smoke";
import { jsonSecurityResponse } from "@/lib/server/security";

export async function GET() {
  return jsonSecurityResponse({
    ok: true,
    message: "UTF-8 virker for danske tegn: \u00e6, \u00f8, \u00e5, \u00c6, \u00d8, \u00c5.",
    samples: utf8SmokeSamples,
  });
}
