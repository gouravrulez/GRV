"use client";
import { useMemo, useState } from "react";
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
  id: number;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  badge: string;
  tone: string;
  description: string;
};
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
const products: Product[] = [];
export default function Home() {
  const [active, setActive] = useState("Shop all"),
    [search, setSearch] = useState(""),
    [cartOpen, setCartOpen] = useState(false),
    [checkout, setCheckout] = useState(false),
    [age, setAge] = useState(true),
    [cart, setCart] = useState<Record<number, number>>({}),
    [market, setMarket] = useState(markets[0]);
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
  const items = products
      .filter((p) => cart[p.id])
      .map((p) => ({ ...p, qty: cart[p.id] })),
    count = Object.values(cart).reduce((a, b) => a + b, 0),
    subtotal = items.reduce((s, p) => s + p.price * p.qty, 0);
  const go = (c: string) => {
    setActive(c);
    setTimeout(
      () =>
        document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" }),
      20,
    );
  };
  const add = (p: Product, buy = false) => {
    setCart((c) => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }));
    toast.success(p.name + " added to your bag");
    buy ? setCheckout(true) : setCartOpen(true);
  };
  const qty = (id: number, n: number) =>
    setCart((c) => {
      const next = { ...c },
        v = (next[id] || 0) + n;
      v > 0 ? (next[id] = v) : delete next[id];
      return next;
    });
  return (
    <main>
      <Toaster position="top-center" richColors />
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
        <b>OPEN 24/7 — INCLUDING SUNDAYS</b>
        <i />
        <PackageCheck /> DISCREET PACKAGING · INDIA & INTERNATIONAL DELIVERY
      </div>
      <header>
        <a className="logo" href="/" aria-label="KAOMA home">
          <img className="logoImage" src="/kaoma-logo.png" alt="KAOMA" />
        </a>
        <nav>
          <a href="/">Home</a>
          <a href="/categories">Categories</a>
          <a href="/best-sellers">Best Sellers</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact Us</a>
        </nav>
        <div className="actions">
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
      <section className="hero">
        <img
          src="/kamadeva-rati-hero.png"
          alt="Elegant artistic interpretation of Kamadeva and Rati in a flowering spring garden"
        />
        <div className="shade" />
        <div className="heroCopy">
          <p>DESIRE · BEAUTY · CONNECTION</p>
          <h1>
            The art of pleasure,
            <br />
            <em>beautifully expressed.</em>
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
          <aside className="filterSide">
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
                    <span>{p.badge}</span>
                    <button>
                      <Heart />
                    </button>
                    <i />
                    <strong>{p.category}</strong>
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
                      <button onClick={() => add(p)}>Add to bag</button>
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
              src="/kaoma-logo.png"
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
                  setCartOpen(false);
                  setCheckout(true);
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
          <div className="steps">
            <b>1 Contact</b>
            <span>2 Delivery</span>
            <span>3 Payment</span>
          </div>
          <div className="two">
            <label>
              First name
              <input autoComplete="given-name" placeholder="First name" />
            </label>
            <label>
              Last name
              <input autoComplete="family-name" placeholder="Last name" />
            </label>
          </div>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              placeholder="Order confirmation email"
            />
          </label>
          <label>
            Phone, including country code
            <input
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
            />
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
            <input
              autoComplete="street-address"
              placeholder="House number and street"
            />
          </label>
          <div className="two">
            <label>
              City
              <input autoComplete="address-level2" placeholder="City" />
            </label>
            <label>
              State / Province
              <input
                autoComplete="address-level1"
                placeholder="State or province"
              />
            </label>
          </div>
          <label>
            Postal / ZIP code
            <input
              autoComplete="postal-code"
              placeholder="Postal or ZIP code"
            />
          </label>
          <p className="checkoutMarket">
            <Globe2 /> Checkout currency:{" "}
            <b>
              {market.currency} ({market.symbol})
            </b>
          </p>
          <button
            className="primary full"
            onClick={() =>
              toast.info(
                "International payment setup comes after business approval",
              )
            }
          >
            Continue to delivery
          </button>
          <p className="secure">
            <LockKeyhole /> Your details remain private and encrypted.
          </p>
        </DialogContent>
      </Dialog>
    </main>
  );
}
