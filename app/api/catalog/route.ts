import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function publicDb(path: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Store database is not configured.");

  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Store catalogue is temporarily unavailable.");
  return response.json();
}

export async function GET() {
  try {
    const [products, categories] = await Promise.all([
      publicDb("products?select=*&status=eq.active&order=created_at.desc"),
      publicDb("categories?select=id,name&active=eq.true"),
    ]);
    return NextResponse.json(
      { products, categories },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Catalogue unavailable." },
      { status: 503 },
    );
  }
}
