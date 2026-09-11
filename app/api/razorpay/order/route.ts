import { NextResponse } from "next/server";
import { authenticatedCustomer, razorpay, requireServerConfiguration, serviceDb } from "@/lib/razorpay-server";

type CheckoutItem = { id?: string; qty?: number; size?: string; colour?: string };
type Product = { id: string; name: string; price: number; stock_quantity: number; status: string | null };

export async function POST(request: Request) {
  try {
    const { user } = await authenticatedCustomer(request);
    const body = await request.json();
    const items = Array.isArray(body.items) ? (body.items as CheckoutItem[]) : [];
    const address = body.address && typeof body.address === "object" ? body.address : {};
    const currency = String(body.currency || "INR").toUpperCase();
    const supported = new Set(["INR", "USD", "GBP", "EUR", "AED", "AUD", "CAD", "SGD"]);
    if (!supported.has(currency)) throw new Error("This checkout currency is not supported.");
    if (!items.length || items.length > 50) throw new Error("Your bag is empty or too large.");
    if (![address.line1, address.city, address.region, address.postal_code, address.country, address.phone].every((value) => String(value || "").trim()))
      throw new Error("Complete all delivery details before paying.");

    const cleanItems = items.map((item) => ({
      id: String(item.id || ""), qty: Math.max(1, Math.min(20, Number(item.qty) || 1)),
      size: String(item.size || "Standard").slice(0, 80), colour: String(item.colour || "As shown").slice(0, 80),
    }));
    if (cleanItems.some((item) => !/^[0-9a-f-]{36}$/i.test(item.id))) throw new Error("Invalid product in bag.");
    const ids = [...new Set(cleanItems.map((item) => item.id))];
    const products = (await serviceDb(`products?id=in.(${ids.join(",")})&select=id,name,price,stock_quantity,status`)) as Product[];
    if (products.length !== ids.length) throw new Error("A product in your bag is unavailable.");
    const productMap = new Map(products.map((product) => [product.id, product]));
    let subtotalInr = 0;
    for (const item of cleanItems) {
      const product = productMap.get(item.id)!;
      if (!["active", "published", null].includes(product.status)) throw new Error(`${product.name} is unavailable.`);
      if (product.stock_quantity < item.qty) throw new Error(`Only ${product.stock_quantity} of ${product.name} available.`);
      subtotalInr += Number(product.price) * item.qty;
    }

    const settingRows = await serviceDb("site_settings?key=eq.commerce&select=value");
    const commerce = settingRows?.[0]?.value || {};
    const rate = Number(commerce.rates?.[currency] || (currency === "INR" ? 1 : 0));
    if (!rate) throw new Error("Currency conversion is temporarily unavailable.");
    const freeAbove = Number(commerce.shipping?.free_above || 5000);
    const shippingInr = subtotalInr >= freeAbove ? 0 : String(address.country) === "India" ? Number(commerce.shipping?.India || 99) : Number(commerce.shipping?.International || 1499);
    const subtotal = Number((subtotalInr * rate).toFixed(2));
    const shipping = Number((shippingInr * rate).toFixed(2));
    const total = Number((subtotal + shipping).toFixed(2));
    const amount = Math.round(total * 100);
    if (amount < 100) throw new Error("Order amount is below the payment minimum.");

    const orderNumber = `KAOMA-${Date.now().toString().slice(-8)}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
    const paymentOrder = await razorpay("orders", {
      method: "POST",
      body: JSON.stringify({ amount, currency, receipt: orderNumber, notes: { kaoma_order: orderNumber, customer_id: user.id } }),
    });
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
    return NextResponse.json({ key: razorpayKeyId, razorpayOrderId: paymentOrder.id, amount, currency, orderNumber });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start payment." }, { status: 400 });
  }
}
