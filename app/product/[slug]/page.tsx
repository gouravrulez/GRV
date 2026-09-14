import type { Metadata } from "next";
import { ProductPage } from "@/components/product-page";
import { getSeoProduct } from "@/lib/catalog-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getSeoProduct(slug);
  if (!product) return { title: "Product", robots: { index: false, follow: true } };
  const description = (product.short_description || product.description || `Shop ${product.name} at KAOMA.`).slice(0, 160);
  const canonical = `/product/${product.slug || product.id}`;
  return {
    title: product.name,
    description,
    alternates: { canonical },
    openGraph: { title: product.name, description, url: canonical, type: "website", images: product.image_urls?.filter(Boolean).slice(0, 4) },
    twitter: { card: "summary_large_image", title: product.name, description, images: product.image_urls?.filter(Boolean).slice(0, 1) },
  };
}

export default async function ProductRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getSeoProduct(slug);
  const schema = product ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description || product.description || undefined,
    image: product.image_urls?.filter(Boolean),
    sku: product.sku || undefined,
    brand: { "@type": "Brand", name: "KAOMA" },
    offers: {
      "@type": "Offer",
      url: `https://kaoma.in/product/${product.slug || product.id}`,
      priceCurrency: product.currency || "INR",
      price: product.price,
      availability: (product.stock_quantity ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  } : null;
  return <>
    {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />}
    <ProductPage slug={slug} />
  </>;
}
