"use client";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { db, supabaseReady } from "@/lib/supabase-rest";
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
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
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

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  badge: string;
  tone: string;
  description: string;
  image_urls?: string[];
  sizes?: string[];
  colours?: string[];
  stock_quantity:number;
};
type StorefrontSettings={announcement?:string;packaging_message?:string;logo_url?:string;hero_image_url?:string;eyebrow?:string;heading?:string};
type CartLine={qty:number;size:string;colour:string};
type ProductReview={id:string;product_id:string;reviewer_name:string;rating:number;title?:string;body:string};
const cats = [
  "Shop all",
  "For Women",
  "For Men",
  "Golden Night",
  "Foreplay",
  "Unique Gifts",
];
const markets = [
  { country: "India", currency: "INR", symbol: "₹" },
  { country: "United States", currency: "USD", symbol: "$" },
  { country: "United Kingdom", currency: "GBP", symbol: "£" },
  { country: "European Union", currency: "EUR", symbol: "€" },
  { country: "United Arab Emirates", currency: "AED", symbol: "د.إ" },
  { country: "Australia", currency: "AUD", symbol: "A$" },
  { country: "Canada", currency: "CAD", symbol: "C$" },
  { country: "Singapore", currency: "SGD", symbol: "S$" },
];
export default function Home() {
  const [active, setActive] = useState("Shop all"),
    [search, setSearch] = useState(""),
    [cartOpen, setCartOpen] = useState(false),
    [checkout, setCheckout] = useState(false),
    [filtersOpen, setFiltersOpen] = useState(false),
    [menuOpen, setMenuOpen] = useState(false),
    [age, setAge] = useState(true),
    [cart, setCart] = useState<Record<string, CartLine>>({}),
    [products, setProducts] = useState<Product[]>([]),
    [selectedProduct, setSelectedProduct] = useState<Product | null>(null),
    [selectedSize,setSelectedSize]=useState(""),
    [selectedColour,setSelectedColour]=useState(""),
    [reviews,setReviews]=useState<ProductReview[]>([]),
    [placingOrder,setPlacingOrder]=useState(false),
    [customerEmail,setCustomerEmail]=useState(""),
    [storefront,setStorefront]=useState<StorefrontSettings>({}),
    [market, setMarket] = useState(markets[0]);
  useEffect(() => {
    setCustomerEmail(localStorage.getItem("kaoma_customer_email")||"");
    if (!supabaseReady) return;
    db("products?select=id,name,description,price,image_urls,sizes,colours,stock_quantity,status,featured,best_seller,new_arrival,categories(name)&status=eq.active&order=created_at.desc")
      .then((rows) => setProducts(rows.map((p: Record<string, unknown>) => ({ id:String(p.id), name:String(p.name), description:String(p.description||""), price:Number(p.price||0), category:String((p.categories as {name?:string}|null)?.name||"Shop all"), image_urls:(p.image_urls as string[])||[],sizes:(p.sizes as string[])||[],colours:(p.colours as string[])||[],stock_quantity:Number(p.stock_quantity||0), badge:(p.best_seller?"Best seller":p.new_arrival?"New":"Featured"), tone:"rose" }))))
      .catch(() => {});
    db("reviews?select=id,product_id,reviewer_name,rating,title,body&status=eq.approved&order=created_at.desc").then(setReviews).catch(()=>{});
    db("site_settings?select=key,value&key=in.(branding,homepage)").then((rows)=>setStorefront(rows.reduce((all:StorefrontSettings,row:{value?:StorefrontSettings})=>({...all,...row.value}),{}))).catch(()=>{});
  }, []);
  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (active === "Shop all" ||
            p.category === active ||
            (active === "Clothing" &&
              ["Clothing", "Lingerie", "Sleepwear"].includes(p.category))) &&
          (p.name + p.description).toLowerCase().includes(search.toLowerCase()),
      ),
    [active, search],
  );
  const items = products.filter((p) => cart[p.id]).map((p) => ({ ...p, ...cart[p.id] })),
    count = Object.values(cart).reduce((a, b) => a + b.qty, 0),
    subtotal = items.reduce((s, p) => s + p.price * p.qty, 0);
  const go = (c: string) => {
    setActive(c);
    setTimeout(
      () =>
        document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" }),
      20,
    );
  };
  const add = (p: Product, buy = false, size=selectedSize||p.sizes?.[0]||"Standard",colour=selectedColour||p.colours?.[0]||"As shown") => {
    if(p.stock_quantity<1){toast.error("This product is currently out of stock");return}
    setCart((c) => ({ ...c, [p.id]: {qty:Math.min((c[p.id]?.qty||0)+1,p.stock_quantity),size,colour} }));
    toast.success(p.name + " added to your bag");
    setSelectedProduct(null);buy ? openCheckout() : setCartOpen(true);
  };
  const openProduct=(p:Product)=>{setSelectedProduct(p);setSelectedSize(p.sizes?.[0]||"");setSelectedColour(p.colours?.[0]||"")};
  const openCheckout=()=>{if(!localStorage.getItem("kaoma_customer_token")){toast.error("Please sign in before purchasing");setTimeout(()=>location.href="/account",500);return}setCartOpen(false);setCheckout(true)};
  const qty = (id: string, n: number) =>
    setCart((c) => {
      const next = { ...c },
        v = (next[id]?.qty || 0) + n;
      v > 0 ? (next[id] = {...next[id],qty:v}) : delete next[id];
      return next;
    });
  async function placeOrder(event:FormEvent<HTMLFormElement>){event.preventDefault();const token=localStorage.getItem("kaoma_customer_token")||"",userId=localStorage.getItem("kaoma_customer_id")||"",email=localStorage.getItem("kaoma_customer_email")||"";if(!token||!userId){toast.error("Please sign in before purchasing");location.href="/account";return}if(!items.length){toast.error("Your bag is empty");return}setPlacingOrder(true);const form=new FormData(event.currentTarget),fullName=`${form.get("first_name")} ${form.get("last_name")}`.trim(),address={line1:String(form.get("address")),city:String(form.get("city")),region:String(form.get("region")),postal_code:String(form.get("postal_code")),country:market.country,phone:String(form.get("phone"))},orderNumber=`KAOMA-${Date.now().toString().slice(-8)}-${crypto.randomUUID().slice(0,4).toUpperCase()}`;try{await db("profiles?on_conflict=user_id",token,{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify({user_id:userId,full_name:fullName,email,phone:address.phone,country:address.country,address_line1:address.line1,city:address.city,region:address.region,postal_code:address.postal_code})});const created=await db("orders",token,{method:"POST",body:JSON.stringify({user_id:userId,order_number:orderNumber,customer_email:email,currency:"INR",subtotal,shipping:0,tax:0,total:subtotal,status:"pending",payment_status:"pending",shipping_address:address})});const orderId=created?.[0]?.id;if(!orderId)throw Error("Order could not be created.");await db("order_items",token,{method:"POST",body:JSON.stringify(items.map(item=>({order_id:orderId,product_id:item.id,product_name:item.name,quantity:item.qty,unit_price:item.price,selected_size:item.size,selected_colour:item.colour})))});void fetch("/api/order-email",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({customerEmail:email,orderNumber})});setCart({});setCheckout(false);toast.success(`Order ${orderNumber} created. Payment confirmation is pending.`)}catch(error){toast.error(error instanceof Error?error.message:"Unable to place order") }finally{setPlacingOrder(false)}}
  async function submitReview(event:FormEvent<HTMLFormElement>){event.preventDefault();const token=localStorage.getItem("kaoma_customer_token")||"",userId=localStorage.getItem("kaoma_customer_id")||"";if(!token||!userId){toast.error("Sign in to write a verified review");location.href="/account";return}if(!selectedProduct)return;const form=new FormData(event.currentTarget);try{await db("reviews",token,{method:"POST",body:JSON.stringify({product_id:selectedProduct.id,user_id:userId,reviewer_name:String(form.get("reviewer_name")),rating:Number(form.get("rating")),title:String(form.get("title")),body:String(form.get("body")),status:"pending"})});event.currentTarget.reset();toast.success("Review submitted for approval") }catch(error){toast.error(error instanceof Error?error.message:"Unable to submit review")}}
  return (
    <main>
      <Toaster position="top-center" richColors />
      <Dialog open={Boolean(selectedProduct)} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="productGalleryDialog">
          <DialogHeader><DialogTitle>{selectedProduct?.name}</DialogTitle><DialogDescription>{selectedProduct?.description}</DialogDescription></DialogHeader>
          <div className="customerGallery">{selectedProduct?.image_urls?.map((src,index)=><figure key={src}><div><Image src={src} alt={`${selectedProduct.name} ${index===0?"main image":`promotional image ${index}`}`} fill sizes="(max-width: 700px) 92vw, 45vw" unoptimized/></div><figcaption>{index===0?"Main image":`Promotional image ${index}`}</figcaption></figure>)}</div>
          {selectedProduct&&<><div className="variantSelectors">{Boolean(selectedProduct.sizes?.length)&&<label>Size<select value={selectedSize} onChange={e=>setSelectedSize(e.target.value)}>{selectedProduct.sizes?.map(size=><option key={size}>{size}</option>)}</select></label>}{Boolean(selectedProduct.colours?.length)&&<label>Colour<select value={selectedColour} onChange={e=>setSelectedColour(e.target.value)}>{selectedProduct.colours?.map(colour=><option key={colour}>{colour}</option>)}</select></label>}</div><p className="stockLine">{selectedProduct.stock_quantity>0?`${selectedProduct.stock_quantity} in stock`:"Out of stock"}</p><div className="galleryBuy"><button className="primary" onClick={()=>add(selectedProduct)}>Add to cart</button><button className="primary" onClick={()=>add(selectedProduct,true)}>Buy now</button></div><section className="productReviews"><h3>Customer reviews</h3>{reviews.filter(review=>review.product_id===selectedProduct.id).map(review=><article key={review.id}><b>{"★".repeat(review.rating)} · {review.reviewer_name}</b><span>{review.title||review.body}</span></article>)}{!reviews.some(review=>review.product_id===selectedProduct.id)&&<p>No reviews yet.</p>}<form onSubmit={submitReview}><input name="reviewer_name" placeholder="Your name" required/><select name="rating" defaultValue="5"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select><input name="title" placeholder="Review title"/><textarea name="body" placeholder="Share your experience" required/><button className="outlineReview">Submit verified review</button></form></section></>}
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
        <b>{storefront.announcement||"OPEN 24/7 — INCLUDING SUNDAYS"}</b>
        <i />
        <PackageCheck /> {storefront.packaging_message||"DISCREET PACKAGING · INDIA & INTERNATIONAL DELIVERY"}
      </div>
      <header>
        <a className="logo" href="/" aria-label="KAOMA home">
          <Image className="logoImage" src={storefront.logo_url||"/kaoma-logo.webp"} alt="KAOMA" width={190} height={54} unoptimized />
        </a>
        <nav>
          <a href="/">Home</a>
          <a href="/categories">Categories</a>
          <a href="/best-sellers">Best Sellers</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact Us</a>
        </nav>
        <div className="actions">
          <button className="menuButton" title="Open menu" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu />
          </button>
          <label
            className="market"
            title="Choose shipping country and currency"
          >
            <Globe2 />
            <select
              aria-label="Shipping country and currency"
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
            <DialogTrigger asChild>
              <button title="Customer login">
                <UserRound />
              </button>
            </DialogTrigger>
            <DialogContent className="formCard">
              <DialogHeader>
                <DialogTitle>Your private account</DialogTitle>
                <DialogDescription>
                  Sign in to view orders, save favourites and check out faster.
                </DialogDescription>
              </DialogHeader>
              <label>
                Email
                <input type="email" placeholder="you@example.com" />
              </label>
              <label>
                Password
                <input type="password" placeholder="••••••••" />
              </label>
              <button className="primary full">Sign in securely</button>
              <a className="linkBtn" href="/account">
                Create a new account
              </a>
            </DialogContent>
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
            <SheetDescription>Explore our private adult store.</SheetDescription>
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
          src={storefront.hero_image_url||"/kamadeva-rati-hero.webp"}
          alt="Elegant artistic interpretation of Kamadeva and Rati in a flowering spring garden"
          fill
          priority
          sizes="100vw"
          quality={86}
          unoptimized={Boolean(storefront.hero_image_url)}
        />
        <div className="shade" />
        <div className="heroCopy">
          <p>{storefront.eyebrow||"DESIRE · BEAUTY · CONNECTION"}</p>
          <h1>{storefront.heading||<>The art of pleasure,<br/><em>beautifully expressed.</em></>}</h1>
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
            <span><SlidersHorizontal /> Filters</span>
            <ChevronDown className={filtersOpen ? "turned" : ""} />
          </button>
          <aside id="catalog-filters" className={`filterSide ${filtersOpen ? "filterOpen" : ""}`}>
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
                <article key={p.id}>
                  <div className={"art " + p.tone}>
                    {p.image_urls?.[0] && <Image className="productImage" src={p.image_urls[0]} alt={p.name} fill sizes="(max-width: 700px) 100vw, 25vw" unoptimized />}
                    <span>{p.badge}</span>
                    <button>
                      <Heart />
                    </button>
                    <i />
                    <strong>{p.category}</strong>
                    {p.image_urls&&p.image_urls.length>1&&<button className="galleryCount" onClick={()=>openProduct(p)}>{p.image_urls.length} photos</button>}
                  </div>
                  <div className="info">
                    <small>{p.category}</small>
                    <h3>{p.name}</h3>
                    <p>{p.description}</p>
                    <div className="price">
                      <b>₹{p.price.toLocaleString("en-IN")}</b>
                      {p.oldPrice && (
                        <del>₹{p.oldPrice.toLocaleString("en-IN")}</del>
                      )}
                    </div>
                    <div className="productBtns">
                      <button onClick={() => p.image_urls?.length?openProduct(p):add(p)}>{p.image_urls?.length?"View details":"Add to cart"}</button>
                      <button onClick={() => add(p, true)}>Buy now</button>
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
          <small>
            Shipping market: {market.country} · {market.currency}
          </small>
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
                      <span>₹{p.price.toLocaleString("en-IN")}</span>
                      <span className="cartVariant">Size: {p.size} · Colour: {p.colour}</span>
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
                <b>₹{subtotal.toLocaleString("en-IN")}</b>
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
          <form onSubmit={placeOrder} className="checkoutForm"><div className="steps">
            <b>1 Contact</b>
            <span>2 Delivery</span>
            <span>3 Payment</span>
          </div>
          <div className="two">
            <label>
              First name
              <input name="first_name" autoComplete="given-name" placeholder="First name" required />
            </label>
            <label>
              Last name
              <input name="last_name" autoComplete="family-name" placeholder="Last name" required />
            </label>
          </div>
          <label>
            Email
            <input type="email" autoComplete="email" value={customerEmail} readOnly />
          </label>
          <label>
            Phone, including country code
            <input name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" required />
          </label>
          <label>
            Country or region
            <select
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
                  {m.country}
                </option>
              ))}
            </select>
          </label>
          <label>
            Street address
            <input name="address" autoComplete="street-address" placeholder="House number and street" required />
          </label>
          <div className="two">
            <label>
              City
              <input name="city" autoComplete="address-level2" placeholder="City" required />
            </label>
            <label>
              State / Province
              <input name="region" autoComplete="address-level1" placeholder="State or province" required />
            </label>
          </div>
          <label>
            Postal / ZIP code
            <input name="postal_code" autoComplete="postal-code" placeholder="Postal or ZIP code" required />
          </label>
          <p className="checkoutMarket">
            <Globe2 /> Checkout currency:{" "}
            <b>
              {market.currency} ({market.symbol})
            </b>
          </p>
          <div className="checkoutTotal"><span>Order total</span><b>₹{subtotal.toLocaleString("en-IN")}</b></div>
          <button className="primary full" disabled={placingOrder}>{placingOrder?"Creating secure order…":"Place order — payment pending"}</button>
          <p className="secure">
            <LockKeyhole /> Your details remain private and encrypted.
          </p>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
