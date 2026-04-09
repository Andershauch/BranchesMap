import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BranchesMap",
    short_name: "BranchesMap",
    description: "Mobilvenligt kort over Sjællands kommuner, brancher og jobestimater.",
    start_url: "/da",
    scope: "/",
    display: "standalone",
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
