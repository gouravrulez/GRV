import { NextResponse } from "next/server";
import { authenticatedCustomer, razorpay, serviceDb, validSignature } from "@/lib/razorpay-server";
import { sendOrderEmails } from "@/lib/order-email";

export async function POST(request: Request) {
  try {
    const { user } = await authenticatedCustomer(request);
    const body = await request.json();
    const orderId = String(body.razorpay_order_id || ""), paymentId = String(body.razorpay_payment_id || ""), signature = String(body.razorpay_signature || "");
    if (!orderId || !paymentId || !validSignature(orderId, paymentId, signature)) throw new Error("Payment verification failed.");
    const payment = await razorpay(`payments/${encodeURIComponent(paymentId)}`);
    if (payment.order_id !== orderId || !["captured", "authorized"].includes(payment.status)) throw new Error("Payment has not been authorised.");
    const orders = await serviceDb(`orders?user_id=eq.${user.id}&razorpay_order_id=eq.${encodeURIComponent(orderId)}&select=id,order_number,customer_email,currency,total,confirmation_email_sent_at`);
    const order = orders?.[0];
    if (!order) throw new Error("KAOMA order was not found.");
    if (order.currency?.toUpperCase() !== String(payment.currency || "").toUpperCase() ||
        Math.round(Number(order.total) * 100) !== Number(payment.amount))
      throw new Error("Payment amount or currency does not match the order.");

    await serviceDb("rpc/finalize_razorpay_paid_once", {
      method: "POST",
      body: JSON.stringify({ p_order_id: order.id, p_payment_id: paymentId, p_signature: signature, p_payment_status: payment.status }),
    });
    let emailSent = Boolean(order.confirmation_email_sent_at);
    if (payment.status === "captured" && !emailSent) {
      try {
        await sendOrderEmails({
          orderNumber: order.order_number,
          customerEmail: order.customer_email || user.email || "",
          currency: order.currency,
          total: Number(order.total),
        });
        await serviceDb(`orders?id=eq.${encodeURIComponent(order.id)}&confirmation_email_sent_at=is.null`, {
          method: "PATCH", body: JSON.stringify({ confirmation_email_sent_at: new Date().toISOString() }),
        });
        emailSent = true;
      } catch (emailError) {
        console.error("[razorpay/verify] order email failed", { message: emailError instanceof Error ? emailError.message : String(emailError), orderNumber: order.order_number });
      }
    }
    return NextResponse.json({ verified: true, captured: payment.status === "captured", orderNumber: order.order_number, emailSent });
  } catch (error) {
    console.error("[razorpay/verify] failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to verify payment." }, { status: 400 });
  }
}
