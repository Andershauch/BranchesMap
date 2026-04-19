import type { MetadataRoute } from "next";

type AppManifestOptions = {
  display: "standalone" | "fullscreen";
  startUrl: string;
};

export function buildAppManifest({
  display,
  startUrl,
}: AppManifestOptions): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "JOBVEJ",
    short_name: "JOBVEJ",
    description: "JOBVEJ - din vej til arbejde.",
    start_url: startUrl,
    scope: "/",
    display,
    orientation: "portrait",
    background_color: "#f8faf7",
    theme_color: "#f8faf7",
    lang: "da",
    categories: ["business", "productivity", "navigation"],
    icons: [
      {
        src: "/icons/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Kort",
        short_name: "Kort",
        description: "Åbn hovedkortet direkte.",
        url: "/da",
      },
      {
        name: "Følger",
        short_name: "Følger",
        description: "Se kommuner du følger.",
        url: "/da/follows",
      },
    ],
  };
}
