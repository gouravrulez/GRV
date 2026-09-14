import type { MetadataRoute } from "next";
import { getSeoCatalogue, slugify } from "@/lib/catalog-server";

const site = "https://kaoma.in";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories } = await getSeoCatalogue();
  const now = new Date();
  const staticPages = [
    "", "categories", "best-sellers", "about", "contact", "guides",
    "shipping", "duties", "returns", "order-tracking", "privacy",
    "terms", "cancellation-refund",
  ];

  return [
    ...staticPages.map((path, index) => ({
      url: `${site}/${path}`,
      lastModified: now,
      changeFrequency: (index === 0 ? "daily" : "monthly") as "daily" | "monthly",
      priority: index === 0 ? 1 : index < 4 ? 0.8 : 0.5,
    })),
    ...categories.map((category) => ({
      url: `${site}/category/${category.slug || slugify(category.name)}`,
      lastModified: category.updated_at ? new Date(category.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: `${site}/product/${product.slug || product.id}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: product.image_urls?.slice(0, 6),
    })),
  ];
}
