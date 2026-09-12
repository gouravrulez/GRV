import { NextResponse } from "next/server";
import { authenticatedCustomer, razorpay, requireServerConfiguration, serviceDb } from "@/lib/razorpay-server";

type CheckoutItem = { id?: string; qty?: number; size?: string; colour?: string };
type Product = { id: string; name: string; price: number; stock_quantity: number; status: string | null };

export async function POST(request: Request) {
  try {
    console.info("[razorpay/order] request received");
    const { user } = await authenticatedCustomer(request);
    const body = await request.json();
    const items = Array.isArray(body.items) ? (body.items as CheckoutItem[]) : [];
    const address = body.address && typeof body.address === "object" ? body.address : {};
    const customer = body.customer && typeof body.customer === "object" ? body.customer : {};
    const currency = String(body.currency || "INR").toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("This checkout currency is not valid.");
    if (!items.length || items.length > 50) throw new Error("Your bag is empty or too large.");
    if (![address.line1, address.city, address.region, address.postal_code, address.country, address.phone].every((value) => String(value || "").trim()))
      throw new Error("Complete all delivery details before paying.");

    const cleanItems = items.map((item) => ({
      id: String(item.id || ""), qty: Math.max(1, Math.min(20, Number(item.qty) || 1)),
      size: String(item.size || "Standard").slice(0, 80), colour: String(item.colour || "As shown").slice(0, 80),
    }));
    if (cleanItems.some((item) => !/^[0-9a-f-]{36}$/i.test(item.id))) throw new Error("Invalid product in bag.");
    const ids = [...new Set(cleanItems.map((item) => item.id))];
    const profileSave = serviceDb("profiles?on_conflict=user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: user.id,
        full_name: String(customer.fullName || "").slice(0, 160),
        email: user.email || String(customer.email || ""),
        phone: String(address.phone || "").slice(0, 40),
        country: String(address.country || "").slice(0, 120),
        address_line1: String(address.line1 || "").slice(0, 300),
        city: String(address.city || "").slice(0, 120),
        region: String(address.region || "").slice(0, 120),
        postal_code: String(address.postal_code || "").slice(0, 30),
      }),
    });
    const [products, settingRows] = await Promise.all([
      serviceDb(`products?id=in.(${ids.join(",")})&select=id,name,price,stock_quantity,status`) as Promise<Product[]>,
      serviceDb("site_settings?key=eq.commerce&select=value"),
    ]);
    if (products.length !== ids.length) throw new Error("A product in your bag is unavailable.");
    const productMap = new Map(products.map((product) => [product.id, product]));
    let subtotalInr = 0;
    for (const item of cleanItems) {
      const product = productMap.get(item.id)!;
      if (!["active", "published", null].includes(product.status)) throw new Error(`${product.name} is unavailable.`);
      if (product.stock_quantity < item.qty) throw new Error(`Only ${product.stock_quantity} of ${product.name} available.`);
      subtotalInr += Number(product.price) * item.qty;
    }

    const commerce = settingRows?.[0]?.value || {};
    let liveRate = 0;
    if (!commerce.rates?.[currency] && currency !== "INR") {
      try {
        const rateResponse = await fetch("https://open.er-api.com/v6/latest/INR", { next: { revalidate: 43200 } });
        const rateData = rateResponse.ok ? await rateResponse.json() : {};
        liveRate = Number(rateData.rates?.[currency] || 0);
      } catch { liveRate = 0; }
    }
    const rate = Number(commerce.rates?.[currency] || (currency === "INR" ? 1 : liveRate));
    if (!rate) throw new Error("Currency conversion is temporarily unavailable.");
    const shippingEnabled = commerce.shipping?.enabled === true;
    const freeAbove = Number(commerce.shipping?.free_above ?? 5000);
    const shippingInr = !shippingEnabled || subtotalInr >= freeAbove
      ? 0
      : String(address.country) === "India"
        ? Number(commerce.shipping?.India ?? 0)
        : Number(commerce.shipping?.International ?? 0);
    const subtotal = Number((subtotalInr * rate).toFixed(2));
    const shipping = Number((shippingInr * rate).toFixed(2));
    const total = Number((subtotal + shipping).toFixed(2));
    const amount = Math.round(total * 100);
    if (amount < 100) throw new Error("Order amount is below the payment minimum.");

    const orderNumber = `KAOMA-${Date.now().toString().slice(-8)}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
    const [, paymentOrder] = await Promise.all([
      profileSave,
      razorpay("orders", {
        method: "POST",
        body: JSON.stringify({ amount, currency, receipt: orderNumber, notes: { kaoma_order: orderNumber, customer_id: user.id } }),
      }),
    ]);
    console.info("[razorpay/order] customer details saved", { userId: user.id, currency, itemCount: cleanItems.length });
    const created = await serviceDb("orders", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ user_id: user.id, order_number: orderNumber, customer_email: user.email || "", currency, subtotal, shipping, tax: 0, total, status: "pending", payment_status: "created", shipping_address: address, razorpay_order_id: paymentOrder.id }),
    });
    const orderId = created?.[0]?.id;
    if (!orderId) throw new Error("Order could not be saved.");
    await serviceDb("order_items", {
      method: "POST",
      body: JSON.stringify(cleanItems.map((item) => { const product = productMap.get(item.id)!; return { order_id: orderId, product_id: item.id, product_name: product.name, quantity: item.qty, unit_price: Number((Number(product.price) * rate).toFixed(2)), selected_size: item.size, selected_colour: item.colour }; })),
    });
    const { razorpayKeyId } = requireServerConfiguration();
    console.info("[razorpay/order] order created", { orderNumber, razorpayOrderId: paymentOrder.id });
    return NextResponse.json({ key: razorpayKeyId, razorpayOrderId: paymentOrder.id, amount, currency, orderNumber });
  } catch (error) {
    console.error("[razorpay/order] failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start payment." }, { status: 400 });
  }
}
