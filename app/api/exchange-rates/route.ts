import { NextResponse } from "next/server";

const fallback: Record<string, number> = { INR:1, USD:.012, EUR:.011, GBP:.0094, AED:.044, AUD:.018, CAD:.016, SGD:.016, JPY:1.78, CNY:.086, HKD:.093, NZD:.020, CHF:.0095, SEK:.124, NOK:.128, DKK:.081, SAR:.045, QAR:.044, ZAR:.216, THB:.43, MYR:.056, IDR:195, PHP:.69, KRW:16.5, BDT:.14, LKR:3.6, NPR:1.6 };

export async function GET() {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/INR", { next: { revalidate: 43200 } });
    if (!response.ok) throw new Error("rate service unavailable");
    const data = await response.json();
    const rates = Object.fromEntries(Object.entries(data.rates || {}).filter(([code, value]) => /^[A-Z]{3}$/.test(code) && Number(value) > 0));
    return NextResponse.json({ rates, updated_at: data.time_last_update_utc || null }, { headers: { "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ rates: fallback, fallback: true }, { headers: { "Cache-Control": "public, s-maxage=1800" } });
  }
}
