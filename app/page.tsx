import Storefront, { type Product } from "@/components/storefront";

export const revalidate = 30;

async function getInitialProducts(): Promise<Product[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  try {
    const headers = { apikey: key };
    const [productResponse, categoryResponse] = await Promise.all([
      fetch(`${url}/rest/v1/products?select=*&status=eq.active&order=created_at.desc`, {
        headers,
        next: { revalidate: 30 },
      }),
      fetch(`${url}/rest/v1/categories?select=id,name&active=eq.true`, {
        headers,
        next: { revalidate: 30 },
      }),
    ]);
    if (!productResponse.ok) return [];

    const rows = (await productResponse.json()) as Record<string, unknown>[];
    const categoryRows = categoryResponse.ok
      ? ((await categoryResponse.json()) as { id: string; name: string }[])
      : [];
    const names = new Map(
      categoryRows.map((category) => [String(category.id), category.name]),
    );

    return rows.map((product) => {
      const categoryIds = ((product.category_ids as string[]) || []).length
        ? (product.category_ids as string[]).map(String)
        : product.category_id
          ? [String(product.category_id)]
          : [];
      return {
        id: String(product.id),
        slug: String(product.slug || product.id),
        name: String(product.name || "Product"),
        description: String(product.description || ""),
        price: Number(product.price || 0),
        oldPrice: product.compare_at_price
          ? Number(product.compare_at_price)
          : undefined,
        category: String(names.get(categoryIds[0]) || "Shop all"),
        categoryNames: categoryIds
          .map((id) => String(names.get(id) || ""))
          .filter(Boolean),
        image_urls: (product.image_urls as string[]) || [],
        sizes: (product.sizes as string[]) || [],
        colours: (product.colours as string[]) || [],
        colour_image_map:
          (product.colour_image_map as Record<string, string>) || {},
        related_product_ids: (product.related_product_ids as string[]) || [],
        enable_add_to_cart: product.enable_add_to_cart !== false,
        enable_buy_now: product.enable_buy_now !== false,
        enable_wishlist: product.enable_wishlist !== false,
        stock_quantity: Number(product.stock_quantity || 0),
        badge: product.best_seller
          ? "Best seller"
          : product.new_arrival
            ? "New"
            : "Featured",
        tone: "rose",
      } satisfies Product;
    });
  } catch {
    return [];
  }
}

export default async function Home() {
  return <Storefront initialProducts={await getInitialProducts()} />;
}
