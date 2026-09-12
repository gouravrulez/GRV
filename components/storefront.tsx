"use client";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { clearCustomerSession, db, getValidCustomerSession, supabaseReady } from "@/lib/supabase-rest";
import { worldCountries } from "@/lib/world-countries";
import {
  Heart,
  Search,
  ShoppingBag,
  UserRound,
  X,
  Minus,
  Plus,
  LockKeyhole,
  PackageCheck,
  ChevronRight,
  SlidersHorizontal,
  CheckCircle2,
  Ban,
  MessageCircle,
  Globe2,
  Menu,
  ChevronDown,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { CustomerAccount } from "@/components/customer-account";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryNames: string[];
  price: number;
  oldPrice?: number;
  badge: string;
  tone: string;
  description: string;
  image_urls?: string[];
  sizes?: string[];
  colours?: string[];
  colour_image_map?: Record<string, string>;
  related_product_ids?: string[];
  enable_add_to_cart?: boolean;
  enable_buy_now?: boolean;
  enable_wishlist?: boolean;
  stock_quantity: number;
};
type Commerce = {
  rates?: Record<string, number>;
  shipping?: { enabled?: boolean; India?: number; International?: number; free_above?: number };
  payments?: { provider?: string; enabled?: boolean };
};
type StorefrontSettings = {
  announcement?: string;
  packaging_message?: string;
  logo_url?: string;
  hero_image_url?: string;
  eyebrow?: string;
  heading?: string;
  commerce?: Commerce;
};
type CartLine = { qty: number; size: string; colour: string };
type ProductReview = {
  id: string;
  product_id: string;
  reviewer_name: string;
  rating: number;
  title?: string;
  body: string;
};
type RazorpaySuccess = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayCheckout = { open: () => void; on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void };
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayCheckout;
let razorpayScript: Promise<void> | null = null;
function loadRazorpayCheckout() {
  if (typeof window === "undefined") return Promise.reject(new Error("Checkout is unavailable."));
  if ((window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay) return Promise.resolve();
  if (!razorpayScript) razorpayScript = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = window.setTimeout(() => {
      script.remove();
      razorpayScript = null;
      reject(new Error("Secure payment window took too long to load. Please check your connection and try again."));
    }, 15000);
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timer);
      if ((window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay) resolve();
      else {
        razorpayScript = null;
        reject(new Error("Secure payment window was blocked. Please allow pop-ups and try again."));
      }
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      razorpayScript = null;
      reject(new Error("Secure checkout could not load. Please disable any ad blocker and try again."));
    };
    document.head.appendChild(script);
  });
  return razorpayScript;
}
const cats = [
  "Shop all",
  "For Women",
  "For Men",
  "Golden Night",
  "Foreplay",
  "Unique Gifts",
];
const markets = [
  { country: "India", currency: "INR", symbol: "₹", rate: 1, dialCode: "+91" },
  { country: "United States", currency: "USD", symbol: "$", rate: 0.012, dialCode: "+1" },
  { country: "United Kingdom", currency: "GBP", symbol: "£", rate: 0.0094, dialCode: "+44" },
  { country: "European Union", currency: "EUR", symbol: "€", rate: 0.011, dialCode: "+49" },
  {
    country: "United Arab Emirates",
    currency: "AED",
    symbol: "د.إ",
    rate: 0.044,
    dialCode: "+971",
  },
  { country: "Australia", currency: "AUD", symbol: "A$", rate: 0.018, dialCode: "+61" },
  { country: "Canada", currency: "CAD", symbol: "C$", rate: 0.016, dialCode: "+1" },
  { country: "Singapore", currency: "SGD", symbol: "S$", rate: 0.016, dialCode: "+65" },
];
export default function Storefront({ initialProducts = [] }: { initialProducts?: Product[] }) {
  const [active, setActive] = useState("Shop all"),
    [search, setSearch] = useState(""),
    [cartOpen, setCartOpen] = useState(false),
    [checkout, setCheckout] = useState(false),
    [filtersOpen, setFiltersOpen] = useState(false),
    [menuOpen, setMenuOpen] = useState(false),
    [age, setAge] = useState(true),
    [cart, setCart] = useState<Record<string, CartLine>>({}),
    [products, setProducts] = useState<Product[]>(initialProducts),
    [selectedProduct, setSelectedProduct] = useState<Product | null>(null),
    [selectedSize, setSelectedSize] = useState(""),
    [selectedColour, setSelectedColour] = useState(""),
    [reviews, setReviews] = useState<ProductReview[]>([]),
    [placingOrder, setPlacingOrder] = useState(false),
    [customerEmail, setCustomerEmail] = useState(""),
    [storefront, setStorefront] = useState<StorefrontSettings>({}),
    [wishlist, setWishlist] = useState<string[]>([]),
    [market, setMarket] = useState(markets[0]),
    [destinationCode, setDestinationCode] = useState("IN"),
    [phoneCountryCode, setPhoneCountryCode] = useState("IN");
  useEffect(() => {
    // Warm the Razorpay checkout bundle shortly after page load so the payment
    // window opens quickly when the customer is ready.
    const preload = window.setTimeout(() => {
      void loadRazorpayCheckout().catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(preload);
  }, []);
  useEffect(() => {
    setCustomerEmail(localStorage.getItem("kaoma_customer_email") || "");
    setWishlist(JSON.parse(localStorage.getItem("kaoma_wishlist") || "[]"));
    let cancelled = false;
    const cached = localStorage.getItem("kaoma_catalog_cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Product[];
        if (Array.isArray(parsed)) setProducts(parsed);
      } catch {
        localStorage.removeItem("kaoma_catalog_cache");
      }
    }

    const loadCatalog = async (retry = true) => {
      try {
        // Use KAOMA's same-domain API so browser privacy/CORS/network rules
        // cannot block the initial cross-domain Supabase catalogue request.
        const response = await fetch("/api/catalog", { cache: "no-store" });
        if (!response.ok) throw new Error("Catalogue request failed.");
        const payload = (await response.json()) as {
          products?: Record<string, unknown>[];
          categories?: { id: string; name: string }[];
        };
        const productRows = Array.isArray(payload.products)
          ? payload.products
          : [];
        const categoryRows = Array.isArray(payload.categories)
          ? payload.categories
          : [];
        const names = new Map<string, string>(
          categoryRows.map((c: { id: string; name: string }) => [
            String(c.id),
            c.name,
          ]),
        );
        const catalog = productRows
          .filter((p: Record<string, unknown>) =>
            [undefined, null, "active", "published"].includes(
              p.status as string | null | undefined,
            ),
          )
          .map((p: Record<string, unknown>) => {
            const ids = ((p.category_ids as string[]) || []).length
              ? (p.category_ids as string[]).map(String)
              : p.category_id
                ? [String(p.category_id)]
                : [];
            return {
              id: String(p.id),
              slug: String(p.slug || p.id),
              name: String(p.name),
              description: String(p.description || ""),
              price: Number(p.price || 0),
              category: String(names.get(ids[0]) || "Shop all"),
              categoryNames: ids
                .map((id) => String(names.get(id) || ""))
                .filter(Boolean),
              image_urls: (p.image_urls as string[]) || [],
              sizes: (p.sizes as string[]) || [],
              colours: (p.colours as string[]) || [],
              colour_image_map:
                (p.colour_image_map as Record<string, string>) || {},
              related_product_ids: (p.related_product_ids as string[]) || [],
              enable_add_to_cart: p.enable_add_to_cart !== false,
              enable_buy_now: p.enable_buy_now !== false,
              enable_wishlist: p.enable_wishlist !== false,
              stock_quantity: Number(p.stock_quantity || 0),
              badge: p.best_seller
                ? "Best seller"
                : p.new_arrival
                  ? "New"
                  : "Featured",
              tone: "rose",
            } satisfies Product;
          });
        if (!cancelled) {
          setProducts(catalog);
          localStorage.setItem("kaoma_catalog_cache", JSON.stringify(catalog));
        }
      } catch {
        if (retry && !cancelled)
          window.setTimeout(() => void loadCatalog(false), 700);
      }
    };
    void loadCatalog();
    if (supabaseReady) {
      db(
        "reviews?select=id,product_id,reviewer_name,rating,title,body&status=eq.approved&order=created_at.desc",
      )
        .then(setReviews)
        .catch(() => {});
      db("site_settings?select=key,value&key=in.(branding,homepage,commerce)")
        .then((rows) =>
          setStorefront(
            rows.reduce(
              (
                all: StorefrontSettings,
                row: { key: string; value?: StorefrontSettings | Commerce },
              ) =>
                row.key === "commerce"
                  ? { ...all, commerce: row.value as Commerce }
                  : { ...all, ...row.value },
              {},
            ),
          ),
        )
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, []);
  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (active === "Shop all" ||
            p.categoryNames.includes(active) ||
            p.category === active ||
            (active === "Clothing" &&
              ["Clothing", "Lingerie", "Sleepwear"].includes(p.category))) &&
          (p.name + p.description).toLowerCase().includes(search.toLowerCase()),
      ),
    [active, search],
  );
  const destination = worldCountries.find((country) => country.code === destinationCode) ?? worldCountries.find((country) => country.code === "IN")!,
    phoneCountry = worldCountries.find((country) => country.code === phoneCountryCode) ?? destination,
    rate = storefront.commerce?.rates?.[market.currency] || market.rate,
    formatPrice = (amount: number) =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: market.currency,
        maximumFractionDigits: market.currency === "INR" ? 0 : 2,
      }).format(amount * rate);
  const items = products
      .filter((p) => cart[p.id])
      .map((p) => ({ ...p, ...cart[p.id] })),
    count = Object.values(cart).reduce((a, b) => a + b.qty, 0),
    subtotal = items.reduce((s, p) => s + p.price * p.qty, 0),
    shippingSettings = storefront.commerce?.shipping,
    shipping = shippingSettings?.enabled === true
      ? subtotal >= (shippingSettings.free_above ?? 5000)
        ? 0
        : destination.code === "IN"
          ? shippingSettings.India ?? 0
          : shippingSettings.International ?? 0
      : 0;
  const go = (c: string) => {
    setActive(c);
    setTimeout(
      () =>
        document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" }),
      20,
    );
  };
  const add = (
    p: Product,
    buy = false,
    size = selectedSize || p.sizes?.[0] || "Standard",
    colour = selectedColour || p.colours?.[0] || "As shown",
  ) => {
    if (p.stock_quantity < 1) {
      toast.error("This product is currently out of stock");
      return;
    }
    if (buy) {
      setCart({ [p.id]: { qty: 1, size, colour } });
      toast.success(p.name + " is ready for checkout");
      closeProduct();
      openCheckout();
      return;
    }
    setCart((c) => ({
      ...c,
      [p.id]: {
        qty: Math.min((c[p.id]?.qty || 0) + 1, p.stock_quantity),
        size,
        colour,
      },
    }));
    toast.success(p.name + " added to your bag");
    closeProduct();
    setCartOpen(true);
  };
  const openProduct = (p: Product) => {
    setSelectedProduct(p);
    setSelectedSize(p.sizes?.[0] || "");
    setSelectedColour(p.colours?.[0] || "");
    history.replaceState(null, "", `/?product=${encodeURIComponent(p.slug)}`);
  };
  useEffect(() => {
    if (products.length) {
      const params = new URLSearchParams(location.search);
      const requested = params.get("product");
      if (requested) {
        const found = products.find(
          (p) => p.slug === requested || p.id === requested,
        );
        if (found) {
          const action = params.get("action");
          if (action === "cart" || action === "buy") {
            const size = params.get("size") || found.sizes?.[0] || "Standard";
            const colour = params.get("colour") || found.colours?.[0] || "As shown";
            setCart({ [found.id]: { qty: 1, size, colour } });
            history.replaceState(null, "", "/");
            if (action === "cart") {
              setCartOpen(true);
              toast.success(found.name + " added to your bag");
            } else {
              setTimeout(openCheckout, 50);
            }
            return;
          }
          setSelectedProduct(found);
          setSelectedSize(found.sizes?.[0] || "");
          setSelectedColour(found.colours?.[0] || "");
        }
      }
    }
  }, [products]);
  const closeProduct = () => {
    setSelectedProduct(null);
    if (new URLSearchParams(location.search).has("product"))
      history.replaceState(null, "", "/");
  };
  const toggleWishlist = (id: string) => {
    const next = wishlist.includes(id)
      ? wishlist.filter((x) => x !== id)
      : [...wishlist, id];
    setWishlist(next);
    localStorage.setItem("kaoma_wishlist", JSON.stringify(next));
    toast.success(
      next.includes(id) ? "Saved to wishlist" : "Removed from wishlist",
    );
  };
  async function shareProduct(p: Product) {
    const share = {
      title: p.name,
      text: `View ${p.name} at KAOMA`,
      url: `${location.origin}/?product=${encodeURIComponent(p.slug)}`,
    };
    if (navigator.share) await navigator.share(share);
    else {
      await navigator.clipboard.writeText(share.url);
      toast.success("Product link copied");
    }
  }
  const openCheckout = () => {
    if (!localStorage.getItem("kaoma_customer_token")) {
      toast.error("Please sign in before purchasing");
      setTimeout(() => (location.href = "/account"), 500);
      return;
    }
    setCartOpen(false);
    setCheckout(true);
  };
  const qty = (id: string, n: number) =>
    setCart((c) => {
      const next = { ...c },
        v = (next[id]?.qty || 0) + n;
      v > 0 ? (next[id] = { ...next[id], qty: v }) : delete next[id];
      return next;
    });
  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let token = localStorage.getItem("kaoma_customer_token") || "";
    const userId = localStorage.getItem("kaoma_customer_id") || "",
      email = localStorage.getItem("kaoma_customer_email") || "";
    if (!token || !userId) {
      toast.error("Please sign in before purchasing");
      location.href = "/account";
      return;
    }
    if (!items.length) {
      toast.error("Your bag is empty");
      return;
    }
    // Go straight to KAOMA's same-origin payment API. The server validates the
    // customer token; no third-party browser request may block checkout first.
    setPlacingOrder(true);
    const form = new FormData(event.currentTarget),
      fullName = `${form.get("first_name")} ${form.get("last_name")}`.trim(),
      address = {
        line1: String(form.get("address")),
        city: String(form.get("city")),
        region: String(form.get("region")),
        postal_code: String(form.get("postal_code")),
        country: destination.name,
        country_code: destination.code,
        phone: `${phoneCountry.dialCode} ${String(form.get("phone_number") || "").trim()}`.trim(),
      },
      checkoutItems = items.map((item) => ({ id: item.id, qty: item.qty, size: item.size, colour: item.colour }));
    try {
      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ items: checkoutItems, address, currency: market.currency, customer: { fullName, email } }),
        signal: AbortSignal.timeout(20000),
      });
      const orderText = await orderResponse.text();
      const paymentOrder = orderText ? JSON.parse(orderText) : {};
      if (!orderResponse.ok) throw new Error(paymentOrder.error || "Unable to start payment.");
      await loadRazorpayCheckout();
      const Razorpay = (window as unknown as { Razorpay: RazorpayConstructor }).Razorpay;
      if (!Razorpay) throw new Error("Secure payment window could not open. Please allow pop-ups and try again.");
      const checkoutInstance = new Razorpay({
        key: paymentOrder.key,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: "KAOMA",
        description: `Order ${paymentOrder.orderNumber}`,
        order_id: paymentOrder.razorpayOrderId,
        prefill: { name: fullName, email, contact: address.phone },
        notes: { kaoma_order: paymentOrder.orderNumber },
        theme: { color: "#C34368" },
        modal: {
          ondismiss: () => {
            setPlacingOrder(false);
            setCheckout(true);
          },
          confirm_close: true,
        },
        handler: async (response: RazorpaySuccess) => {
          try {
            const verificationResponse = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verification = await verificationResponse.json();
            if (!verificationResponse.ok || !verification.verified) throw new Error(verification.error || "Payment verification failed.");
            if (verification.captured) {
              setCart({}); setCheckout(false);
              toast.success(verification.emailSent
                ? `Payment received. Order ${verification.orderNumber} is confirmed and emailed.`
                : `Payment received. Order ${verification.orderNumber} is confirmed.`);
            } else toast.success("Payment authorised. Confirmation will appear after capture.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Payment verification failed.");
          } finally { setPlacingOrder(false); }
        },
      });
      checkoutInstance.on("payment.failed", (response) => {
        setPlacingOrder(false);
        setCheckout(true);
        toast.error(response.error?.description || "Payment failed. Please try again.");
      });
      // Radix Dialog intentionally blocks pointer events outside its own modal.
      // Close it and allow React to release the body lock before Razorpay mounts.
      setCheckout(false);
      window.setTimeout(() => checkoutInstance.open(), 80);
    } catch (error) {
      const message = error instanceof DOMException && error.name === "TimeoutError"
        ? "Payment service took too long to respond. Please try again."
        : error instanceof SyntaxError
          ? "Payment service returned an invalid response. Please check the deployment configuration."
          : error instanceof Error
            ? error.message
            : "Unable to place order";
      toast.error(
        message,
      );
      setPlacingOrder(false);
    }
  }
  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let token = localStorage.getItem("kaoma_customer_token") || "";
    const userId = localStorage.getItem("kaoma_customer_id") || "";
    if (!token || !userId) {
      toast.error("Sign in to write a verified review");
      location.href = "/account";
      return;
    }
    if (!selectedProduct) return;
    try {
      token = await getValidCustomerSession();
    } catch {
      clearCustomerSession();
      toast.error("Your session expired. Please sign in again.");
      setTimeout(() => (location.href = "/account"), 700);
      return;
    }
    const form = new FormData(event.currentTarget);
    try {
      await db("reviews", token, {
        method: "POST",
        body: JSON.stringify({
          product_id: selectedProduct.id,
          user_id: userId,
          reviewer_name: String(form.get("reviewer_name")),
          rating: Number(form.get("rating")),
          title: String(form.get("title")),
          body: String(form.get("body")),
          status: "pending",
        }),
      });
      event.currentTarget.reset();
      toast.success("Review submitted for approval");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to submit review",
      );
    }
  }
  return (
    <main>
      <Toaster position="top-center" richColors />
      <Dialog
        open={Boolean(selectedProduct)}
        onOpenChange={(open) => !open && closeProduct()}
      >
        <DialogContent className="productGalleryDialog">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              {selectedProduct?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="customerGallery">
            {selectedProduct?.image_urls?.map((src, index) => (
              <figure key={src}>
                <div>
                  <Image
                    src={src}
                    alt={`${selectedProduct.name} ${index === 0 ? "main image" : `promotional image ${index}`}`}
                    fill
                    sizes="(max-width: 700px) 92vw, 45vw"
                    quality={74}
                  />
                </div>
                <figcaption>
                  {index === 0 ? "Main image" : `Promotional image ${index}`}
                </figcaption>
              </figure>
            ))}
          </div>
          {selectedProduct && (
            <>
              <div className="variantSelectors">
                {Boolean(selectedProduct.sizes?.length) && (
                  <label>
                    Size
                    <select
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value)}
                    >
                      {selectedProduct.sizes?.map((size) => (
                        <option key={size}>{size}</option>
                      ))}
                    </select>
                  </label>
                )}
                {Boolean(selectedProduct.colours?.length) && (
                  <label>
                    Colour
                    <select
                      value={selectedColour}
                      onChange={(e) => setSelectedColour(e.target.value)}
                    >
                      {selectedProduct.colours?.map((colour) => (
                        <option key={colour}>{colour}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {selectedColour &&
                selectedProduct.colour_image_map?.[selectedColour] && (
                  <p className="colourPreview">
                    Selected colour: <b>{selectedColour}</b> · its matching
                    image is shown in the gallery.
                  </p>
                )}
              <p className="stockLine">
                {selectedProduct.stock_quantity > 0
                  ? `${selectedProduct.stock_quantity} in stock`
                  : "Out of stock"}
              </p>
              <div className="galleryBuy">
                {selectedProduct.enable_add_to_cart !== false && (
                  <button
                    className="primary"
                    onClick={() => add(selectedProduct)}
                  >
                    Add to cart
                  </button>
                )}
                {selectedProduct.enable_buy_now !== false && (
                  <button
                    className="primary"
                    onClick={() => add(selectedProduct, true)}
                  >
                    Buy now
                  </button>
                )}
                {selectedProduct.enable_wishlist !== false && (
                  <button
                    className="outlineReview"
                    onClick={() => toggleWishlist(selectedProduct.id)}
                  >
                    <Heart />{" "}
                    {wishlist.includes(selectedProduct.id)
                      ? "Saved"
                      : "Wishlist"}
                  </button>
                )}
                <button
                  className="outlineReview"
                  onClick={() => void shareProduct(selectedProduct)}
                >
                  <Share2 /> Share
                </button>
              </div>
              {Boolean(selectedProduct.related_product_ids?.length) && (
                <section className="relatedProducts">
                  <h3>Similar choices</h3>
                  <div>
                    {products
                      .filter((p) =>
                        selectedProduct.related_product_ids?.includes(p.id),
                      )
                      .map((p) => (
                        <button key={p.id} onClick={() => openProduct(p)}>
                          {p.image_urls?.[0] && (
                            <Image
                              src={p.image_urls[0]}
                              alt=""
                              width={72}
                              height={72}
                              quality={60}
                            />
                          )}
                          <span>
                            {p.name}
                            <small>{formatPrice(p.price)}</small>
                          </span>
                        </button>
                      ))}
                  </div>
                </section>
              )}
              <section className="productReviews">
                <h3>Customer reviews</h3>
                {reviews
                  .filter((review) => review.product_id === selectedProduct.id)
                  .map((review) => (
                    <article key={review.id}>
                      <b>
                        {"★".repeat(review.rating)} · {review.reviewer_name}
                      </b>
                      <span>{review.title || review.body}</span>
                    </article>
                  ))}
                {!reviews.some(
                  (review) => review.product_id === selectedProduct.id,
                ) && <p>No reviews yet.</p>}
                <form onSubmit={submitReview}>
                  <input
                    name="reviewer_name"
                    placeholder="Your name"
                    required
                  />
                  <select name="rating" defaultValue="5">
                    <option value="5">5 stars</option>
                    <option value="4">4 stars</option>
                    <option value="3">3 stars</option>
                    <option value="2">2 stars</option>
                    <option value="1">1 star</option>
                  </select>
                  <input name="title" placeholder="Review title" />
                  <textarea
                    name="body"
                    placeholder="Share your experience"
                    required
                  />
                  <button className="outlineReview">
                    Submit verified review
                  </button>
                </form>
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={age} onOpenChange={() => {}}>
        <DialogContent className="ageCard [&>button]:hidden">
          <div className="ageMark">18+</div>
          <DialogHeader>
            <DialogTitle>Please confirm your age</DialogTitle>
            <DialogDescription>
              This store contains adult wellness products. Choose one option
              below to continue or leave the website.
            </DialogDescription>
          </DialogHeader>
          <div className="ageChoices">
            <button className="ageYes" onClick={() => setAge(false)}>
              <CheckCircle2 />
              <span>
                <b>Yes, I am 18+</b>
                <small>Enter the website</small>
              </span>
            </button>
            <button className="ageNo" onClick={() => history.back()}>
              <Ban />
              <span>
                <b>No, I am under 18</b>
                <small>Exit the website</small>
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="announce">
        <b>{storefront.announcement || "OPEN 24/7 — INCLUDING SUNDAYS"}</b>
        <i />
        <PackageCheck />{" "}
        {storefront.packaging_message ||
          "DISCREET PACKAGING · INDIA & INTERNATIONAL DELIVERY"}
      </div>
      <header>
        <a className="logo" href="/" aria-label="KAOMA home">
          <Image
            className="logoImage"
            src={storefront.logo_url || "/kaoma-logo.webp"}
            alt="KAOMA"
            width={190}
            height={54}
            unoptimized
          />
        </a>
        <nav>
          <a href="/">Home</a>
          <a href="/categories">Categories</a>
          <a href="/best-sellers">Best Sellers</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact Us</a>
        </nav>
        <div className="actions">
          <button
            className="menuButton"
            title="Open menu"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </button>
          <label
            className="market"
            title="Choose checkout currency"
          >
            <Globe2 />
            <select
              aria-label="Checkout currency"
              value={market.currency}
              onChange={(e) =>
                setMarket(
                  markets.find((m) => m.currency === e.target.value) ??
                    markets[0],
                )
              }
            >
              {markets.map((m) => (
                <option key={m.currency} value={m.currency}>
                  {m.currency}
                </option>
              ))}
            </select>
          </label>
          <button
            title="Search products"
            onClick={() => document.getElementById("search")?.focus()}
          >
            <Search />
          </button>
          <a className="iconLink" href="/wishlist" title="Wishlist">
            <Heart />
          </a>
          <Dialog>
            <DialogTrigger asChild><button title="Customer login" aria-label="Open customer login"><UserRound /></button></DialogTrigger>
            <DialogContent className="formCard otpLoginDialog"><CustomerAccount /></DialogContent>
          </Dialog>
          <button className="bag" onClick={() => setCartOpen(true)}>
            <ShoppingBag />
            <b>{count}</b>
          </button>
        </div>
      </header>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="mobileMenu">
          <SheetHeader>
            <SheetTitle>KAOMA</SheetTitle>
            <SheetDescription>
              Explore our private adult store.
            </SheetDescription>
          </SheetHeader>
          <nav className="mobileNav">
            <a href="/">Home</a>
            <a href="/categories">Categories</a>
            <a href="/best-sellers">Best Sellers</a>
            <a href="/about">About Us</a>
            <a href="/contact">Contact Us</a>
            <a href="/account">Customer Login</a>
          </nav>
        </SheetContent>
      </Sheet>
      <section className="hero">
        <Image
          src={storefront.hero_image_url || "/kamadeva-rati-hero.webp"}
          alt="Elegant artistic interpretation of Kamadeva and Rati in a flowering spring garden"
          fill
          priority
          sizes="100vw"
          quality={86}
          unoptimized={Boolean(storefront.hero_image_url)}
        />
        <div className="shade" />
        <div className="heroCopy">
          <p>{storefront.eyebrow || "DESIRE · BEAUTY · CONNECTION"}</p>
          <h1>
            {storefront.heading || (
              <>
                The art of pleasure,
                <br />
                <em>beautifully expressed.</em>
              </>
            )}
          </h1>
          <span>
            Inspired by Kāma—the celebration of love, desire and aesthetic
            enjoyment—through intimate dressing, thoughtful wellness and
            discreet care.
          </span>
          <div>
            <button className="primary" onClick={() => go("Shop all")}>
              Explore Collection
            </button>
            <a className="outline" href="/categories">
              Shop Now
            </a>
          </div>
        </div>
        <div className="privacy">
          <LockKeyhole />
          <span>
            <b>Privacy, always</b>Plain packaging and discreet delivery.
          </span>
        </div>
      </section>
      <section className="promises">
        {[
          ["100% discreet", "Your privacy comes first"],
          ["International delivery", "Tracked shipping worldwide"],
          ["Inclusive by design", "Made for all adults"],
          ["Private support", "Judgement-free guidance"],
        ].map((x) => (
          <div key={x[0]}>
            <b>{x[0]}</b>
            <span>{x[1]}</span>
          </div>
        ))}
      </section>
      <section id="categories" className="catGrid">
        {cats.slice(1).map((c, i) => (
          <a
            className={"cat miniCat c" + ((i % 3) + 1)}
            href={"/category/" + c.toLowerCase().replaceAll(" ", "-")}
            key={c}
          >
            <span className="catIcon">{["♀", "♂", "☾", "♡", "✦"][i]}</span>
            <strong>{c}</strong>
            <small>
              {
                [
                  "Dressing & wellness",
                  "Confidence & care",
                  "Wedding-night edit",
                  "Connection essentials",
                  "Memorable surprises",
                ][i]
              }
            </small>
            <ChevronRight />
          </a>
        ))}
      </section>
      <section id="shop" className="shop">
        <div className="shopTitle">
          <div>
            <p>CURATED FOR YOU</p>
            <h2>{active === "Shop all" ? "All products" : active}</h2>
          </div>
          <span>{filtered.length} products</span>
        </div>
        <div className="shopBody">
          <button
            className="mobileFilterButton"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="catalog-filters"
          >
            <span>
              <SlidersHorizontal /> Filters
            </span>
            <ChevronDown className={filtersOpen ? "turned" : ""} />
          </button>
          <aside
            id="catalog-filters"
            className={`filterSide ${filtersOpen ? "filterOpen" : ""}`}
          >
            <h3>
              <SlidersHorizontal /> Filters
            </h3>
            <div>
              <b>All Categories</b>
              {cats.map((c) => (
                <button
                  className={active === c ? "selected" : ""}
                  onClick={() => setActive(c)}
                  key={c}
                >
                  <span>{c}</span>
                  <small>›</small>
                </button>
              ))}
            </div>
            <div>
              <b>Shop by</b>
              <label>
                <input type="checkbox" /> New arrivals
              </label>
              <label>
                <input type="checkbox" /> Best sellers
              </label>
              <label>
                <input type="checkbox" /> Gift ready
              </label>
            </div>
            <div>
              <b>Availability</b>
              <label>
                <input type="checkbox" /> In stock
              </label>
            </div>
          </aside>
          <div className="catalogArea">
            <div className="tools">
              <label className="search">
                <Search />
                <input
                  id="search"
                  placeholder="Search all products"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <select aria-label="Sort products">
                <option>Featured</option>
                <option>Newest</option>
                <option>Price: Low to high</option>
                <option>Price: High to low</option>
              </select>
            </div>
            <div className="products">
              {filtered.map((p) => (
                <article
                  key={p.id}
                  className="clickableProductCard"
                  role="link"
                  tabIndex={0}
                  onClick={() => (location.href = `/product/${encodeURIComponent(p.slug)}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ")
                      location.href = `/product/${encodeURIComponent(p.slug)}`;
                  }}
                >
                  <div className={"art " + p.tone}>
                    {p.image_urls?.[0] && (
                      <Image
                        className="productImage"
                        src={p.image_urls[0]}
                        alt={p.name}
                        fill
                        sizes="(max-width: 520px) 92vw, (max-width: 900px) 46vw, 24vw"
                        quality={64}
                      />
                    )}
                    <span>{p.badge}</span>
                    {p.enable_wishlist !== false && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleWishlist(p.id);
                        }}
                        aria-label="Add to wishlist"
                      >
                        <Heart />
                      </button>
                    )}
                    <i />
                    <strong>{p.category}</strong>
                    {p.image_urls && p.image_urls.length > 1 && (
                      <button
                        className="galleryCount"
                        onClick={(event) => {
                          event.stopPropagation();
                          location.href = `/product/${encodeURIComponent(p.slug)}`;
                        }}
                      >
                        {p.image_urls.length} photos
                      </button>
                    )}
                  </div>
                  <div className="info">
                    <small>{p.category}</small>
                    <h3>{p.name}</h3>
                    <p>{p.description}</p>
                    <div className="price">
                      <b>{formatPrice(p.price)}</b>
                      {p.oldPrice && <del>{formatPrice(p.oldPrice)}</del>}
                    </div>
                    <div className="productBtns">
                      {p.enable_add_to_cart !== false && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            add(p);
                          }}
                        >
                          Add to cart
                        </button>
                      )}
                      {p.enable_buy_now !== false && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            add(p, true);
                          }}
                        >Buy now</button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!filtered.length && (
              <div className="catalogEmpty">
                <ShoppingBag />
                <h3>Our collection is being prepared</h3>
                <p>
                  Products, photographs and prices will be added later from the
                  admin panel.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
      <section id="about" className="journal">
        <div>
          <p>THE ART OF KĀMA</p>
          <h2>Desire is part of a life lived beautifully.</h2>
          <span>
            In the classical Indian idea of the four aims of life, Kāma includes
            love, desire, sensory pleasure and aesthetic enjoyment. Our modern
            interpretation centres mutual respect, comfort, confidence and
            wellbeing.
          </span>
          <a className="journalLink" href="/guides">
            Explore pleasure & wellness guides <ChevronRight />
          </a>
        </div>
        <div>
          {[
            "A thoughtful guide to intimate wellness",
            "The art of dressing for confidence",
            "Care, comfort and body-safe choices",
          ].map((x, i) => (
            <a href="/guides" key={x}>
              {x}
              <small>{6 - i} min</small>
            </a>
          ))}
        </div>
      </section>
      <a
        className="floatingSocial"
        href="/contact"
        title="Chat with KAOMA"
        aria-label="Chat with KAOMA"
      >
        <MessageCircle />
      </a>
      <footer>
        <div>
          <b className="logo">
            <img
              className="logoImage footerLogo"
              src="/kaoma-logo.webp"
              alt="KAOMA"
            />
          </b>
          <p>
            KAOMA is a global, inclusive destination for pleasure dressing,
            intimate wellness and discreet gifting.
          </p>
          <a href="https://kaoma.in">kaoma.in</a>
        </div>
        <div>
          <b>Shop</b>
          <a href="/category/for-women">For Women</a>
          <a href="/category/for-men">For Men</a>
          <a href="/category/golden-night">Golden Night</a>
          <a href="/category/unique-gifts">Unique Gifts</a>
        </div>
        <div>
          <b>International help</b>
          <a href="/shipping">Worldwide delivery</a>
          <a href="/duties">Customs & duties</a>
          <a href="/returns">Shipping & returns</a>
          <a href="/order-tracking">Order tracking</a>
        </div>
        <div>
          <b>Connect with KAOMA</b>
          <a href="mailto:kaomaglobal@gmail.com">kaomaglobal@gmail.com</a>
          <a
            href="https://www.instagram.com/kaoma.in/"
            target="_blank"
            rel="noreferrer"
          >
            Instagram · @kaoma.in
          </a>
          <a
            href="https://www.facebook.com/kaoma.in"
            target="_blank"
            rel="noreferrer"
          >
            Facebook · kaoma.in
          </a>
          <a href="/account">Customer login</a>
        </div>
      </footer>
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="cartSheet">
          <SheetHeader>
            <SheetTitle>Your bag ({count})</SheetTitle>
            <SheetDescription>
              Delivered in plain, unbranded packaging.
            </SheetDescription>
          </SheetHeader>
          {items.length ? (
            <>
              <div className="cartItems">
                {items.map((p) => (
                  <div className="cartItem" key={p.id}>
                    <i className={p.tone} />
                    <div>
                      <b>{p.name}</b>
                      <span>{formatPrice(p.price)}</span>
                      <span className="cartVariant">
                        Size: {p.size} · Colour: {p.colour}
                      </span>
                      <small>
                        <button onClick={() => qty(p.id, -1)}>
                          <Minus />
                        </button>
                        {p.qty}
                        <button onClick={() => qty(p.id, 1)}>
                          <Plus />
                        </button>
                      </small>
                    </div>
                    <button onClick={() => qty(p.id, -p.qty)}>
                      <X />
                    </button>
                  </div>
                ))}
              </div>
              <div className="coupon">
                <input placeholder="Promotional code" />
                <button
                  onClick={() =>
                    toast.info("Code will be verified at checkout")
                  }
                >
                  Apply
                </button>
              </div>
              <div className="total">
                <span>Subtotal</span>
                <b>{formatPrice(subtotal)}</b>
              </div>
              <button
                className="primary full"
                onClick={() => {
                  openCheckout();
                }}
              >
                Proceed to secure checkout
              </button>
              <button className="linkBtn" onClick={() => setCartOpen(false)}>
                Continue shopping
              </button>
            </>
          ) : (
            <div className="emptyBag">
              <ShoppingBag />
              <h3>Your bag is waiting</h3>
              <p>Explore clothing and wellness, then add what feels right.</p>
              <button className="primary" onClick={() => setCartOpen(false)}>
                Continue shopping
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Dialog open={checkout} onOpenChange={setCheckout}>
        <DialogContent className="formCard checkout">
          <DialogHeader>
            <DialogTitle>Secure international checkout</DialogTitle>
            <DialogDescription>
              Delivery options, taxes and duties will be calculated for the
              selected destination when live payments are connected.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={placeOrder} className="checkoutForm">
            <div className="steps">
              <b>1 Contact</b>
              <span>2 Delivery</span>
              <span>3 Payment</span>
            </div>
            <div className="two">
              <label>
                First name
                <input
                  name="first_name"
                  autoComplete="given-name"
                  placeholder="First name"
                  required
                />
              </label>
              <label>
                Last name
                <input
                  name="last_name"
                  autoComplete="family-name"
                  placeholder="Last name"
                  required
                />
              </label>
            </div>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={customerEmail}
                readOnly
              />
            </label>
            <label>
              Phone number
              <div className="checkoutPhone">
                <select
                  name="phone_country"
                  value={phoneCountryCode}
                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                  aria-label="Country calling code"
                >
                  {worldCountries.map((country) => (
                    <option key={`${country.code}-phone`} value={country.code}>
                      {country.dialCode} · {country.name}
                    </option>
                  ))}
                </select>
                <input
                  name="phone_number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="Enter phone number"
                  pattern="[0-9 ()-]{6,20}"
                  required
                />
              </div>
            </label>
            <label>
              Country or region
              <select
                name="country"
                value={destinationCode}
                onChange={(e) => {
                  const nextCountry = worldCountries.find(
                    (country) => country.code === e.target.value,
                  );
                  setDestinationCode(e.target.value);
                  if (nextCountry) setPhoneCountryCode(nextCountry.code);
                }}
              >
                {worldCountries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Street address
              <input
                name="address"
                autoComplete="street-address"
                placeholder="House number and street"
                required
              />
            </label>
            <div className="two">
              <label>
                City
                <input
                  name="city"
                  autoComplete="address-level2"
                  placeholder="City"
                  required
                />
              </label>
              <label>
                State / Province
                <input
                  name="region"
                  autoComplete="address-level1"
                  placeholder="State or province"
                  required
                />
              </label>
            </div>
            <label>
              Postal / ZIP code
              <input
                name="postal_code"
                autoComplete="postal-code"
                placeholder="Postal or ZIP code"
                required
              />
            </label>
            <p className="checkoutMarket">
              <Globe2 /> Checkout currency:{" "}
              <b>
                {market.currency} ({market.symbol})
              </b>
            </p>
            <div className="checkoutTotal">
              <span>Subtotal</span>
              <b>{formatPrice(subtotal)}</b>
              <span>Estimated shipping</span>
              <b>{shipping ? formatPrice(shipping) : "Free"}</b>
              <span>Order total</span>
              <b>{formatPrice(subtotal + shipping)}</b>
            </div>
            <button className="primary full" disabled={placingOrder}>
              {placingOrder
                ? "Opening secure payment…"
                : "Pay securely with Razorpay"}
            </button>
            <p className="secure">
              <LockKeyhole /> Your details remain private and encrypted.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
