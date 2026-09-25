import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendOrderEmails } from "@/lib/order-email";
import { serviceDb } from "@/lib/razorpay-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RazorpayEvent = {
  event?: string;
  payload?: {
    order?: { entity?: { id?: string; amount?: number; currency?: string } };
    payment?: { entity?: { id?: string; order_id?: string; status?: string; amount?: number; currency?: string } };
  };
};

function signed(body: string, received: string, secret: string) {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return /^[a-f0-9]{64}$/i.test(received) &&
    timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[razorpay/webhook] RAZORPAY_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook unavailable" }, { status: 503 });
  }
  const rawBody = await request.text();
  if (!signed(rawBody, request.headers.get("x-razorpay-signature") || "", secret))
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  try {
    const event = JSON.parse(rawBody) as RazorpayEvent;
    if (event.event !== "order.paid") return NextResponse.json({ received: true });
    const payment = event.payload?.payment?.entity;
    const rpOrder = event.payload?.order?.entity;
    if (!payment?.id || !payment.order_id || payment.status !== "captured" ||
        !rpOrder?.id || payment.order_id !== rpOrder.id ||
        payment.currency?.toUpperCase() !== rpOrder.currency?.toUpperCase() ||
        payment.amount !== rpOrder.amount)
      throw new Error("Inconsistent paid order event");

    const orders = await serviceDb(
      `orders?razorpay_order_id=eq.${encodeURIComponent(rpOrder.id)}&select=id,order_number,customer_email,currency,total,shipping_address,confirmation_email_sent_at`
    ) as Array<{
      id: string; order_number: string; customer_email: string; currency: string;
      total: number; shipping_address: Record<string, unknown> | null;
      confirmation_email_sent_at: string | null;
    }>;
    const order = orders?.[0];
    if (!order) throw new Error("Paid KAOMA order not found");
    if (order.currency.toUpperCase() !== payment.currency.toUpperCase() ||
        Math.round(Number(order.total) * 100) !== payment.amount)
      throw new Error("Payment amount or currency does not match order");

    await serviceDb("rpc/finalize_razorpay_paid_once", {
      method: "POST",
      body: JSON.stringify({
        p_order_id: order.id, p_payment_id: payment.id,
        p_signature: "", p_payment_status: "captured",
      }),
    });
    if (!order.confirmation_email_sent_at) {
      await sendOrderEmails({
        orderNumber: order.order_number, customerEmail: order.customer_email,
        currency: order.currency, total: Number(order.total),
        address: order.shipping_address || undefined,
      });
      await serviceDb(`orders?id=eq.${encodeURIComponent(order.id)}&confirmation_email_sent_at=is.null`, {
        method: "PATCH", body: JSON.stringify({ confirmation_email_sent_at: new Date().toISOString() }),
      });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[razorpay/webhook] processing failed", {
      eventId: request.headers.get("x-razorpay-event-id"),
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Unable to process event" }, { status: 500 });
  }
}
