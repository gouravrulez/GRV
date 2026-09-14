import { cache } from "react";

export type SeoProduct = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  short_description?: string | null;
  price: number;
  compare_at_price?: number | null;
  currency?: string | null;
  sku?: string | null;
  stock_quantity?: number | null;
  image_urls?: string[] | null;
  updated_at?: string | null;
};

export type SeoCategory = {
  id: string;
  name: string;
  slug?: string | null;
  updated_at?: string | null;
};

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

async function read<T>(path: string): Promise<T> {
  const database = config();
  if (!database) throw new Error("Catalogue is not configured.");
  const response = await fetch(`${database.url}/rest/v1/${path}`, {
    headers: { apikey: database.key },
    next: { revalidate: 900 },
  });
  if (!response.ok) throw new Error("Catalogue is temporarily unavailable.");
  return response.json() as Promise<T>;
}

export const getSeoProduct = cache(async (slug: string) => {
  try {
    const rows = await read<SeoProduct[]>(
      `products?select=id,slug,name,description,short_description,price,compare_at_price,currency,sku,stock_quantity,image_urls,updated_at&slug=eq.${encodeURIComponent(slug)}&status=eq.active&limit=1`,
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
});

export async function getSeoCatalogue() {
  try {
    const [products, categories] = await Promise.all([
      read<SeoProduct[]>(
        "products?select=id,slug,name,description,short_description,price,currency,stock_quantity,image_urls,updated_at&status=eq.active&order=created_at.desc",
      ),
      read<SeoCategory[]>(
        "categories?select=id,name,slug,updated_at&active=eq.true&order=sort_order",
      ),
    ]);
    return { products, categories };
  } catch {
    return { products: [], categories: [] };
  }
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
