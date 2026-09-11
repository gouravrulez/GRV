import { NextResponse } from "next/server";
import { authenticatedCustomer, razorpay, serviceDb, validSignature } from "@/lib/razorpay-server";

export async function POST(request: Request) {
  try {
    const { user } = await authenticatedCustomer(request);
    const body = await request.json();
    const orderId = String(body.razorpay_order_id || ""), paymentId = String(body.razorpay_payment_id || ""), signature = String(body.razorpay_signature || "");
    if (!orderId || !paymentId || !validSignature(orderId, paymentId, signature)) throw new Error("Payment verification failed.");
    const payment = await razorpay(`payments/${encodeURIComponent(paymentId)}`);
    if (payment.order_id !== orderId || !["captured", "authorized"].includes(payment.status)) throw new Error("Payment has not been authorised.");
    const orders = await serviceDb(`orders?user_id=eq.${user.id}&razorpay_order_id=eq.${encodeURIComponent(orderId)}&select=id,order_number,payment_status`);
    const order = orders?.[0];
    if (!order) throw new Error("KAOMA order was not found.");
    await serviceDb("rpc/finalize_razorpay_order", {
      method: "POST",
      body: JSON.stringify({ p_order_id: order.id, p_payment_id: paymentId, p_signature: signature, p_payment_status: payment.status }),
    });
    return NextResponse.json({ verified: true, captured: payment.status === "captured", orderNumber: order.order_number });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to verify payment." }, { status: 400 });
  }
}
