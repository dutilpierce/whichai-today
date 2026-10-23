import type { MetadataRoute } from "next";
import models from "@/lib/models.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(models.last_updated);
  return [
    {
      url: "https://whichai.today",
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://whichai.today/about",
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];
}
