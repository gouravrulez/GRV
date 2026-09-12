type OrderEmailDetails = {
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  currency?: string;
  total?: number;
  address?: Record<string, unknown>;
};

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] || character);

export async function sendOrderEmails(details: OrderEmailDetails) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is missing in Vercel.");
  const from = process.env.ORDER_EMAIL_FROM || "KAOMA <orders@kaoma.in>";
  const admin = process.env.ADMIN_ORDER_EMAIL || "kaomaglobal@gmail.com";
  const order = escapeHtml(details.orderNumber);
  const customer = escapeHtml(details.customerName || "KAOMA customer");
  const amount = details.total == null ? "" : `${escapeHtml(details.currency || "INR")} ${Number(details.total).toFixed(2)}`;
  const address = details.address || {};
  const addressText = [address.line1, address.city, address.region, address.postal_code, address.country]
    .filter(Boolean).map(escapeHtml).join(", ");

  const customerHtml = `<div style="font-family:Arial,sans-serif;color:#39243f;line-height:1.6"><h1 style="color:#54233a">Your KAOMA order is confirmed</h1><p>Hello ${customer},</p><p>Thank you for choosing KAOMA. We have received your payment and order.</p><p><b>Order:</b> ${order}</p>${amount ? `<p><b>Total:</b> ${amount}</p>` : ""}<p>Your order will be prepared in discreet packaging. Tracking information will be emailed after dispatch.</p><p>KAOMA · kaoma.in</p></div>`;
  const adminHtml = `<div style="font-family:Arial,sans-serif;color:#39243f;line-height:1.6"><h1 style="color:#54233a">New paid KAOMA order</h1><p><b>Order:</b> ${order}</p><p><b>Customer:</b> ${customer}</p><p><b>Email:</b> ${escapeHtml(details.customerEmail)}</p>${amount ? `<p><b>Total:</b> ${amount}</p>` : ""}${addressText ? `<p><b>Delivery:</b> ${addressText}</p>` : ""}<p>Open the KAOMA admin dashboard to process this order.</p></div>`;
  const messages = [
    { to: details.customerEmail, subject: `KAOMA order ${details.orderNumber} confirmed`, html: customerHtml, key: "customer" },
    { to: admin, subject: `New paid KAOMA order ${details.orderNumber}`, html: adminHtml, key: "admin" },
  ];
  const responses = await Promise.all(messages.map((message) => fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `kaoma-${details.orderNumber}-${message.key}`,
    },
    body: JSON.stringify({ from, to: message.to, subject: message.subject, html: message.html }),
    signal: AbortSignal.timeout(12000),
  })));
  const failures = await Promise.all(responses.map(async (response) => response.ok ? "" : await response.text()));
  if (failures.some(Boolean)) throw new Error(failures.filter(Boolean).join(" | ") || "Resend rejected the order email.");
  return { sent: true };
}
