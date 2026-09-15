"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Share2, ShoppingBag, ShieldCheck, Truck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import { db, getCurrentUser, getValidCustomerSession } from "@/lib/supabase-rest";
import { trackCommerceEvent } from "@/lib/analytics";

type Product = {
  id: string; slug: string; name: string; description?: string; short_description?: string;
  material?: string; care_instructions?: string; price: number; compare_at_price?: number;
  stock_quantity: number; image_urls?: string[]; sizes?: string[]; colours?: string[];
  colour_image_map?: Record<string,string>; related_product_ids?: string[];
  category_id?: string|null; category_ids?: string[]; size_guide?: string;
};
type Review = { id:string; reviewer_name:string; rating:number; title?:string; body:string; created_at?:string };

export function ProductPage({ slug }: { slug: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [all, setAll] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState("");
  const [colour, setColour] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [delivery, setDelivery] = useState({ preparationMin:1, preparationMax:3, indiaMin:2, indiaMax:7, internationalMin:7, internationalMax:21 });
  const [stockEmail, setStockEmail] = useState("");
  const [stockBusy, setStockBusy] = useState(false);

  useEffect(() => {
    fetch("/api/catalog", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("Unable to load product")))
      .then((data) => {
        const rows = (data.products || []) as Product[];
        const found = rows.find((p) => p.slug === decodeURIComponent(slug) || p.id === slug) || null;
        setAll(rows); setProduct(found);
        setSize(found?.sizes?.[0] || ""); setColour(found?.colours?.[0] || "");
        if (found) {
          trackCommerceEvent("view_item", { currency: "INR", value: Number(found.price), items: [{ item_id: found.id, item_name: found.name, price: Number(found.price), quantity: 1 }] });
          const previous = JSON.parse(localStorage.getItem("kaoma_recent_products") || "[]") as string[];
          const next = [found.id, ...previous.filter(id => id !== found.id)].slice(0, 8);
          localStorage.setItem("kaoma_recent_products", JSON.stringify(next));
          setRecentIds(next);
        }
      })
      .catch(() => toast.error("Unable to load this product. Please try again."))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    db("site_settings?select=value&key=eq.commerce")
      .then((rows) => {
        const shipping=rows?.[0]?.value?.shipping || {};
        setDelivery({
          preparationMin:Number(shipping.preparation_min_days ?? 1),
          preparationMax:Number(shipping.preparation_max_days ?? 3),
          indiaMin:Number(shipping.india_delivery_min_days ?? 2),
          indiaMax:Number(shipping.india_delivery_max_days ?? 7),
          internationalMin:Number(shipping.international_delivery_min_days ?? 7),
          internationalMax:Number(shipping.international_delivery_max_days ?? 21),
        });
      }).catch(()=>undefined);
  }, []);
  useEffect(() => {
    if (!product?.id) return;
    db(`reviews?select=id,reviewer_name,rating,title,body,created_at&product_id=eq.${product.id}&status=eq.approved&order=created_at.desc`)
      .then(setReviews).catch(() => setReviews([]));
    if (!localStorage.getItem("kaoma_customer_token")) return;
    getValidCustomerSession().then(async (customerToken) => {
      const orders = await db("orders?select=id&payment_status=eq.paid", customerToken);
      if (!orders.length) return;
      const ids = orders.map((order:{id:string}) => order.id).join(",");
      const purchased = await db(`order_items?select=product_id&product_id=eq.${product.id}&order_id=in.(${ids})&limit=1`, customerToken);
      setCanReview(Boolean(purchased.length));
    }).catch(() => setCanReview(false));
  }, [product?.id]);

  async function submitReview(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!product) return; setReviewBusy(true);
    try {
      const customerToken = await getValidCustomerSession();
      const user = await getCurrentUser(customerToken);
      const form = new FormData(event.currentTarget);
      await db("reviews", customerToken, { method:"POST", body:JSON.stringify({ product_id:product.id, user_id:user.id, reviewer_name:String(form.get("name") || "Verified customer"), rating:Number(form.get("rating")), title:String(form.get("title") || ""), body:String(form.get("body")), status:"pending" }) });
      event.currentTarget.reset(); setCanReview(false); toast.success("Thank you. Your review was submitted for approval.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to submit review."); }
    finally { setReviewBusy(false); }
  }

  const images = useMemo(() => product?.image_urls?.filter(Boolean) || [], [product]);
  const categoryIds = new Set([product?.category_id, ...(product?.category_ids || [])].filter(Boolean));
  const related = all.filter((p) => p.id !== product?.id && (product?.related_product_ids?.includes(p.id) || [p.category_id, ...(p.category_ids || [])].some(id => id && categoryIds.has(id)))).slice(0, 4);
  const recentlyViewed = recentIds.filter(id => id !== product?.id).map(id => all.find(item => item.id === id)).filter((item):item is Product => Boolean(item)).slice(0, 4);
  const actionUrl = (action: "cart" | "buy") => `/?product=${encodeURIComponent(product?.slug || slug)}&action=${action}&size=${encodeURIComponent(size)}&colour=${encodeURIComponent(colour)}`;
  async function share() {
    const url = location.href;
    if (navigator.share) await navigator.share({ title: product?.name || "KAOMA", url });
    else { await navigator.clipboard.writeText(url); toast.success("Product link copied"); }
  }
  async function requestStockNotice(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(!product)return; setStockBusy(true);
    try {
      const response=await fetch("/api/back-in-stock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:product.id,email:stockEmail})});
      const result=await response.json(); if(!response.ok)throw new Error(result.error||"Unable to save request.");
      toast.success("We will email you when this product returns."); setStockEmail("");
    } catch(error){toast.error(error instanceof Error?error.message:"Unable to save request.");}
    finally{setStockBusy(false);}
  }

  if (loading) return <main className="productPageState">Loading product…</main>;
  if (!product) return <main className="productPageState"><h1>Product not found</h1><Link href="/">Return to shop</Link></main>;

  return <main className="dedicatedProductPage">
    <Toaster position="top-center" richColors />
    <header className="productPageHeader"><Link className="productPageLogo" href="/">KAOMA</Link><Link href="/#shop">Continue shopping</Link></header>
    <nav className="breadcrumbs"><Link href="/">Home</Link><span>›</span><Link href="/#shop">Shop</Link><span>›</span><b>{product.name}</b></nav>
    <section className="productPageHero">
      <div className="productMedia">
        <div className="productThumbs">
          {images.map((src, i) => <button className={i === activeImage ? "active" : ""} key={src} onClick={() => setActiveImage(i)}><Image src={src} alt="" fill sizes="76px" /></button>)}
        </div>
        <div className="productMainImage">
          {images[activeImage] ? <Image src={images[activeImage]} alt={product.name} fill priority sizes="(max-width: 800px) 94vw, 48vw" /> : <div className="productImageMissing"><ShoppingBag/><span>Image being prepared</span></div>}
        </div>
      </div>
      <article className="productPurchase">
        <p className="productEyebrow">KAOMA PRIVATE COLLECTION</p>
        <h1>{product.name}</h1>
        {product.short_description && <p className="productShort">{product.short_description}</p>}
        <div className="productPagePrice"><b>₹{Number(product.price).toLocaleString("en-IN")}</b>{product.compare_at_price ? <del>₹{Number(product.compare_at_price).toLocaleString("en-IN")}</del> : null}</div>
        <p className={product.stock_quantity > 0 ? "inStock" : "outStock"}>{product.stock_quantity > 0 ? `In stock · ${product.stock_quantity} available` : "Currently out of stock"}</p>
        {product.stock_quantity < 1 && <form className="stockNotice" onSubmit={requestStockNotice}><input type="email" value={stockEmail} onChange={event=>setStockEmail(event.target.value)} placeholder="Email for back-in-stock alert" required/><button disabled={stockBusy}>{stockBusy?"Saving…":"Notify me"}</button></form>}
        {!!product.sizes?.length && <fieldset className="productOptions"><legend>Select size</legend>{product.sizes.map(x => <button className={size === x ? "selected" : ""} onClick={() => setSize(x)} key={x}>{x}</button>)}</fieldset>}
        {!!product.colours?.length && <fieldset className="productOptions"><legend>Select colour</legend>{product.colours.map(x => <button className={colour === x ? "selected" : ""} onClick={() => { setColour(x); const mapped=product.colour_image_map?.[x]; const index=images.indexOf(mapped || ""); if(index>=0)setActiveImage(index); }} key={x}>{x}</button>)}</fieldset>}
        <div className="productPageActions"><Link className="secondaryBuy" href={actionUrl("cart")} onClick={() => trackCommerceEvent("add_to_cart", { currency: "INR", value: Number(product.price), items: [{ item_id: product.id, item_name: product.name, price: Number(product.price), quantity: 1, item_variant: [size, colour].filter(Boolean).join(" / ") }] })}>Add to cart</Link><Link className="primaryBuy" href={actionUrl("buy")} onClick={() => trackCommerceEvent("add_to_cart", { currency: "INR", value: Number(product.price), items: [{ item_id: product.id, item_name: product.name, price: Number(product.price), quantity: 1, item_variant: [size, colour].filter(Boolean).join(" / ") }] })}>Buy now</Link></div>
        <div className="productUtility"><button onClick={() => { trackCommerceEvent("add_to_wishlist", { currency: "INR", value: Number(product.price), items: [{ item_id: product.id, item_name: product.name, price: Number(product.price), quantity: 1 }] }); toast.success("Saved to wishlist"); }}><Heart/> Wishlist</button><button onClick={() => void share()}><Share2/> Share product</button></div>
        <div className="productDeliveryEstimate"><Truck/><div><b>Estimated delivery</b><span>Preparation: {delivery.preparationMin}–{delivery.preparationMax} business days</span><span>India delivery: {delivery.indiaMin}–{delivery.indiaMax} business days · International: {delivery.internationalMin}–{delivery.internationalMax}</span></div></div>
        <div className="productAssurance"><span><ShieldCheck/>Private, secure checkout</span><span><Truck/>Discreet tracked delivery</span></div>
      </article>
    </section>
    <section className="productInformation"><article><h2>Product details</h2><p>{product.description || "Full product information will be added soon."}</p></article>{product.material && <article><h2>Material & composition</h2><p>{product.material}</p></article>}{product.care_instructions && <article><h2>Care instructions</h2><p>{product.care_instructions}</p></article>}{product.size_guide && <article className="sizeGuide"><h2>Size guide</h2>{product.size_guide.split("\n").filter(Boolean).map((line,index)=><p key={index}>{line}</p>)}</article>}</section>
    <section className="productReviewsPage"><h2>Customer reviews</h2>
      {reviews.length ? <div className="publishedReviews">{reviews.map((review)=><article key={review.id}><b>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</b><h3>{review.title || "Verified purchase"}</h3><p>{review.body}</p><small>{review.reviewer_name} · Verified purchase</small></article>)}</div> : <p>No approved reviews yet.</p>}
      {canReview ? <form className="writeReview" onSubmit={submitReview}><h3>Write a review</h3><p>Only customers who purchased this product can submit a review.</p><div><input name="name" placeholder="Name shown with review" required/><select name="rating" defaultValue="5" required><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select></div><input name="title" placeholder="Review title"/><textarea name="body" placeholder="Tell other customers about this product" minLength={10} required/><button className="primary" disabled={reviewBusy}>{reviewBusy ? "Submitting…" : "Submit review"}</button></form> : <p className="reviewEligibility">Purchase this product while signed in to write a verified review.</p>}
    </section>
    {!!related.length && <section className="similarProducts"><h2>Similar products</h2><div>{related.map(p => <Link href={`/product/${p.slug}`} key={p.id}>{p.image_urls?.[0] && <span><Image src={p.image_urls[0]} alt={p.name} fill sizes="240px" /></span>}<b>{p.name}</b><small>₹{Number(p.price).toLocaleString("en-IN")}</small></Link>)}</div></section>}
    {!!recentlyViewed.length && <section className="similarProducts recentlyViewed"><h2>Recently viewed</h2><div>{recentlyViewed.map(p => <Link href={`/product/${p.slug}`} key={p.id}>{p.image_urls?.[0] && <span><Image src={p.image_urls[0]} alt={p.name} fill sizes="240px" /></span>}<b>{p.name}</b><small>₹{Number(p.price).toLocaleString("en-IN")}</small></Link>)}</div></section>}
  </main>;
}
