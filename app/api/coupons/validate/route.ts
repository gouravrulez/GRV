import { NextResponse } from "next/server";
import { authenticatedCustomer, serviceDb } from "@/lib/razorpay-server";
export async function POST(request: Request) {
  try {
    await authenticatedCustomer(request);
    const { code, subtotal } = await request.json();
    const clean = String(code || "").trim().toUpperCase();
    const amount = Math.max(0, Number(subtotal) || 0);
    const rows = await serviceDb(`coupons?code=eq.${encodeURIComponent(clean)}&active=eq.true&select=*&limit=1`);
    const coupon = rows?.[0];
    const now = Date.now();
    if (!coupon || (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) || (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) || (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit))
      throw new Error("This promotional code is invalid or expired.");
    if (amount < Number(coupon.minimum_order || 0)) throw new Error(`Minimum order is INR ${coupon.minimum_order}.`);
    let discount = coupon.discount_type === "percentage" ? amount * Number(coupon.discount_value) / 100 : Number(coupon.discount_value);
    if (coupon.maximum_discount) discount = Math.min(discount, Number(coupon.maximum_discount));
    discount = Math.min(amount, Number(discount.toFixed(2)));
    return NextResponse.json({ valid:true, code:coupon.code, discount, message:`${coupon.code} applied successfully` });
  } catch (error) { return NextResponse.json({ error:error instanceof Error?error.message:"Unable to validate code." },{status:400}); }
}
