import { ProductPage } from "@/components/product-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductPage slug={slug} />;
}
