import { NextResponse } from "next/server";
import { authenticatedCustomer, serviceDb } from "@/lib/razorpay-server";
import { sendOrderStatusEmail } from "@/lib/order-email";

type ShippingAddress = Record<string, unknown> & {
  carrier?: string;
  expected_delivery_from?: string;
  expected_delivery_to?: string;
};

export async function POST(request: Request) {
  try {
    const { user } = await authenticatedCustomer(request);
    const admins = await serviceDb(`admins?user_id=eq.${user.id}&select=user_id&limit=1`);
    if (!admins?.length) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

    const input = await request.json() as {
      orderId?: string;
      status?: string;
      tracking_number?: string;
      shipping_address?: ShippingAddress;
    };
    if (!input.orderId) return NextResponse.json({ error: "Order ID is required." }, { status: 400 });

    const rows = await serviceDb(
      `orders?id=eq.${encodeURIComponent(input.orderId)}&select=id,order_number,customer_email,status,tracking_number,shipping_address&limit=1`,
    );
    const current = rows?.[0];
    if (!current) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    const update: Record<string, unknown> = {};
    if (input.status) update.status = input.status;
    if (input.tracking_number !== undefined) update.tracking_number = input.tracking_number;
    if (input.shipping_address) update.shipping_address = input.shipping_address;
    if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

    await serviceDb(`orders?id=eq.${encodeURIComponent(input.orderId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(update),
    });

    const shipping = (input.shipping_address || current.shipping_address || {}) as ShippingAddress;
    const nextStatus = input.status || current.status;
    const statusChanged = input.status && input.status !== current.status;
    const trackingChanged = input.tracking_number !== undefined && input.tracking_number !== current.tracking_number;
    let emailSent = false;
    let emailWarning = "";
    if (current.customer_email && (statusChanged || trackingChanged)) {
      try {
        await sendOrderStatusEmail({
          customerEmail: current.customer_email,
          orderNumber: current.order_number,
          status: nextStatus,
          carrier: shipping.carrier,
          trackingNumber: input.tracking_number ?? current.tracking_number,
          expectedDeliveryFrom: shipping.expected_delivery_from,
          expectedDeliveryTo: shipping.expected_delivery_to,
        });
        emailSent = true;
      } catch (error) {
        emailWarning = error instanceof Error ? error.message : "Status email could not be sent.";
      }
    }
    return NextResponse.json({ updated: true, emailSent, emailWarning });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update order." },
      { status: 500 },
    );
  }
}
