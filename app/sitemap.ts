import { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://cupomhoje.vercel.app";
  const today = new Date();

  return [
    {
      url: base,
      lastModified: today,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${base}/#lojas`,
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/#como-funciona`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
