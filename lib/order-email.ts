import { carrierTrackingUrl } from "@/lib/carriers";

type OrderEmailDetails = {
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  currency?: string;
  total?: number;
  address?: Record<string, unknown>;
};
type StatusEmailDetails = {
  orderNumber: string;
  customerEmail: string;
  status: string;
  carrier?: string;
  trackingNumber?: string | null;
  expectedDeliveryFrom?: string;
  expectedDeliveryTo?: string;
};

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] || character);

async function sendEmail(to: string, subject: string, html: string, idempotencyKey: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is missing in Vercel.");
  const from = process.env.ORDER_EMAIL_FROM || "KAOMA <orders@kaoma.in>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ from, to, subject, html }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error((await response.text()) || "Resend rejected the email.");
}

export async function sendOrderEmails(details: OrderEmailDetails) {
  const admin = process.env.ADMIN_ORDER_EMAIL || "kaomaglobal@gmail.com";
  const order = escapeHtml(details.orderNumber);
  const customer = escapeHtml(details.customerName || "KAOMA customer");
  const amount = details.total == null ? "" : `${escapeHtml(details.currency || "INR")} ${Number(details.total).toFixed(2)}`;
  const address = details.address || {};
  const addressText = [address.line1, address.city, address.region, address.postal_code, address.country]
    .filter(Boolean).map(escapeHtml).join(", ");
  const customerHtml = `<div style="font-family:Arial,sans-serif;color:#39243f;line-height:1.6"><h1 style="color:#54233a">Your KAOMA order is confirmed</h1><p>Hello ${customer},</p><p>Thank you for choosing KAOMA. We have received your payment and order.</p><p><b>Order:</b> ${order}</p>${amount ? `<p><b>Total:</b> ${amount}</p>` : ""}<p>Your order will be prepared in discreet packaging. Tracking information will be emailed after dispatch.</p><p>KAOMA · kaoma.in</p></div>`;
  const adminHtml = `<div style="font-family:Arial,sans-serif;color:#39243f;line-height:1.6"><h1 style="color:#54233a">New paid KAOMA order</h1><p><b>Order:</b> ${order}</p><p><b>Customer:</b> ${customer}</p><p><b>Email:</b> ${escapeHtml(details.customerEmail)}</p>${amount ? `<p><b>Total:</b> ${amount}</p>` : ""}${addressText ? `<p><b>Delivery:</b> ${addressText}</p>` : ""}<p>Open the KAOMA admin dashboard to process this order.</p></div>`;
  await Promise.all([
    sendEmail(details.customerEmail, `KAOMA order ${details.orderNumber} confirmed`, customerHtml, `kaoma-${details.orderNumber}-customer`),
    sendEmail(admin, `New paid KAOMA order ${details.orderNumber}`, adminHtml, `kaoma-${details.orderNumber}-admin`),
  ]);
  return { sent: true };
}

export async function sendOrderStatusEmail(details: StatusEmailDetails) {
  const status = details.status.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
  const trackingUrl = carrierTrackingUrl(details.carrier, details.trackingNumber || "");
  const dates = [details.expectedDeliveryFrom, details.expectedDeliveryTo].filter(Boolean).map(value =>
    new Date(`${value}T12:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  );
  const delivery = dates.length ? `<p><b>Expected delivery:</b> ${escapeHtml(dates.join(" – "))}</p>` : "";
  const tracking = details.trackingNumber
    ? `<p><b>Carrier:</b> ${escapeHtml(details.carrier || "Courier")}<br><b>Tracking number:</b> ${escapeHtml(details.trackingNumber)}</p><p><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#b92c61;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px">Track shipment</a></p>`
    : "";
  const html = `<div style="font-family:Arial,sans-serif;color:#39243f;line-height:1.65;max-width:620px;margin:auto"><p style="letter-spacing:.2em;color:#b92c61;font-weight:bold">KAOMA</p><h1 style="font-family:Georgia,serif;color:#54233a">Your order update</h1><p>Order <b>#${escapeHtml(details.orderNumber)}</b> is now <b>${escapeHtml(status)}</b>.</p>${delivery}${tracking}<p>We will keep your delivery information private and your parcel discreetly packaged.</p><p>KAOMA · <a href="https://kaoma.in">kaoma.in</a></p></div>`;
  await sendEmail(details.customerEmail, `KAOMA order ${details.orderNumber}: ${status}`, html, `kaoma-${details.orderNumber}-status-${details.status}-${details.trackingNumber || "none"}`);
  return { sent: true };
}
