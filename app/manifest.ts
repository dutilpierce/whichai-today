import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WhichAI.today",
    short_name: "WhichAI",
    start_url: "/",
    display: "standalone",
    background_color: "#ebe6dc",
    theme_color: "#ebe6dc",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
