import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Auttus Prospect",
    short_name: "Auttus",
    description: "Operação e supervisão de campanhas de ligação",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    prefer_related_applications: false,
    background_color: "#f8f9fa",
    theme_color: "#0f1e35",
    lang: "pt-BR",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
