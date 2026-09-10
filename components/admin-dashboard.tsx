"use client";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  ClipboardList,
  FolderTree,
  Globe2,
  ImagePlus,
  LogOut,
  PackagePlus,
  Settings,
  ShoppingBag,
  Star,
  Store,
  Users,
} from "lucide-react";
import { db, uploadProductImage } from "@/lib/supabase-rest";
type Cat = { id: string; name: string; slug: string };
type Sub = { id: string; category_id: string; name: string; slug: string };
type Product = {
  id: string;
  name: string;
  category_id: string | null;
  category_ids?: string[];
  subcategory_id: string | null;
  description?: string;
  short_description?: string;
  care_instructions?: string;
  material?: string;
  price: number | null;
  compare_at_price?: number | null;
  stock_quantity: number;
  status: string;
  image_urls: string[];
  sku: string | null;
  featured: boolean;
  best_seller: boolean;
  new_arrival: boolean;
  sizes?: string[];
  colours?: string[];
  colour_image_map?: Record<string, string>;
  related_product_ids?: string[];
  enable_add_to_cart?: boolean;
  enable_buy_now?: boolean;
  enable_wishlist?: boolean;
};
type Order = {
  id: string;
  order_number: string;
  customer_email: string;
  total: number;
  currency: string;
  status: string;
  payment_status: string;
};
type OrderItem = {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  selected_size: string | null;
  selected_colour: string | null;
};
type Customer = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  address_line1: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  created_at: string;
};
type Review = {
  id: string;
  reviewer_name: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  created_at: string;
  products?: { name: string } | null;
};
type SiteSetting = { key: string; value: Record<string, any> };
const slug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

type AdminSection =
  | "overview"
  | "orders"
  | "customers"
  | "categories"
  | "products"
  | "reviews"
  | "branding"
  | "global";
const sectionTitles: Record<
  AdminSection,
  { eyebrow: string; title: string; description: string }
> = {
  overview: {
    eyebrow: "PRIVATE STORE CONTROL",
    title: "Welcome to KAOMA",
    description: "Your complete luxury commerce command centre.",
  },
  orders: {
    eyebrow: "ORDER MANAGEMENT",
    title: "Orders",
    description: "Confirm, prepare, ship and complete every customer order.",
  },
  customers: {
    eyebrow: "CUSTOMER DIRECTORY",
    title: "Customers",
    description: "View registered customers and their delivery information.",
  },
  categories: {
    eyebrow: "STORE ORGANISATION",
    title: "Categories & subcategories",
    description: "Create a refined and easy-to-browse product catalogue.",
  },
  products: {
    eyebrow: "CATALOGUE CONTROL",
    title: "Products & inventory",
    description:
      "Add products, variants, prices, inventory and image galleries.",
  },
  reviews: {
    eyebrow: "CUSTOMER EXPERIENCE",
    title: "Customer reviews",
    description: "Approve, reject or remove product reviews.",
  },
  branding: {
    eyebrow: "BRAND STUDIO",
    title: "Photos, logo & homepage",
    description:
      "Control KAOMA's customer-facing identity and homepage content.",
  },
  global: {
    eyebrow: "GLOBAL COMMERCE",
    title: "Markets, shipping & payments",
    description:
      "Configure currencies, international shipping and future payment providers.",
  },
};

export default function AdminDashboard({ section }: { section: AdminSection }) {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("");
  const [cats, setCats] = useState<Cat[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [edit, setEdit] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  async function load(authToken: string) {
    try {
      if (!(await db("admins?select=user_id&limit=1", authToken)).length)
        throw Error("This account is not authorised for KAOMA administration.");
      const [c, s, p, o, oi, u, r, site] = await Promise.all([
        db("categories?select=id,name,slug&order=sort_order", authToken),
        db(
          "subcategories?select=id,category_id,name,slug&order=sort_order",
          authToken,
        ),
        db("products?select=*&order=created_at.desc", authToken),
        db(
          "orders?select=id,order_number,customer_email,total,currency,status,payment_status&order=created_at.desc",
          authToken,
        ),
        db(
          "order_items?select=id,order_id,product_name,quantity,unit_price,selected_size,selected_colour",
          authToken,
        ),
        db(
          "profiles?select=user_id,full_name,email,phone,country,address_line1,city,region,postal_code,created_at&order=created_at.desc",
          authToken,
        ),
        db(
          "reviews?select=id,reviewer_name,rating,title,body,status,created_at,products(name)&order=created_at.desc",
          authToken,
        ),
        db("site_settings?select=key,value", authToken),
      ]);
      setCats(c);
      setSubs(s);
      setProducts(p);
      setOrders(o);
      setOrderItems(oi);
      setCustomers(u);
      setReviews(r);
      setSettings(site);
      setReady(true);
    } catch (error) {
      setMsg(
        error instanceof Error
          ? error.message
          : "Unable to load administration",
      );
    }
  }
  useEffect(() => {
    const saved = sessionStorage.getItem("kaoma_admin_token") || "";
    if (!saved) {
      location.replace("/admin-login");
      return;
    }
    setToken(saved);
    void load(saved);
  }, []);
  useEffect(() => setProductImages(edit?.image_urls || []), [edit]);
  const branding = useMemo(
    () => settings.find((item) => item.key === "branding")?.value || {},
    [settings],
  );
  const homepage = useMemo(
    () => settings.find((item) => item.key === "homepage")?.value || {},
    [settings],
  );
  const commerce = useMemo(
    () => settings.find((item) => item.key === "commerce")?.value || {},
    [settings],
  );
  async function addCat(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      name = String(f.get("name"));
    await db("categories", token, {
      method: "POST",
      body: JSON.stringify({ name, slug: slug(name) }),
    });
    e.currentTarget.reset();
    await load(token);
  }
  async function addSub(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      name = String(f.get("name"));
    await db("subcategories", token, {
      method: "POST",
      body: JSON.stringify({
        name,
        slug: slug(name),
        category_id: String(f.get("category")),
      }),
    });
    e.currentTarget.reset();
    await load(token);
  }
  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formElement = e.currentTarget,
      f = new FormData(formElement),
      files = f
        .getAll("images")
        .filter((item): item is File => item instanceof File && item.size > 0);
    setUploading(true);
    setMsg("");
    try {
      const uploaded = await Promise.all(
        files.map((file) => uploadProductImage(file, token)),
      );
      const images = [...productImages, ...uploaded],
        name = String(f.get("name")),
        categoryIds = f.getAll("categories").map(String),
        colours = String(f.get("colours"))
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        colourImageMap = colours.reduce(
          (all, colour, index) => ({
            ...all,
            [colour]:
              images[Math.min(index, Math.max(images.length - 1, 0))] || "",
          }),
          {},
        );
      const body = {
        name,
        slug: slug(name),
        sku: String(f.get("sku")) || null,
        category_id: categoryIds[0] || null,
        category_ids: categoryIds,
        subcategory_id: String(f.get("subcategory")) || null,
        description: String(f.get("description")),
        short_description: String(f.get("short_description")),
        material: String(f.get("material")),
        care_instructions: String(f.get("care_instructions")),
        price: Number(f.get("price")) || null,
        compare_at_price: Number(f.get("compare")) || null,
        stock_quantity: Number(f.get("stock")) || 0,
        sizes: String(f.get("sizes"))
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        colours,
        colour_image_map: colourImageMap,
        related_product_ids: f.getAll("related_products").map(String),
        enable_add_to_cart: f.get("enable_add_to_cart") === "on",
        enable_buy_now: f.get("enable_buy_now") === "on",
        enable_wishlist: f.get("enable_wishlist") === "on",
        status: String(f.get("status")),
        featured: f.get("featured") === "on",
        best_seller: f.get("best_seller") === "on",
        new_arrival: f.get("new_arrival") === "on",
        image_urls: images,
      };
      await db(edit ? `products?id=eq.${edit.id}` : "products", token, {
        method: edit ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      setEdit(null);
      setProductImages([]);
      formElement.reset();
      setMsg("Product saved successfully.");
      await load(token);
    } catch (error) {
      setMsg(
        error instanceof Error
          ? error.message
          : "Unable to save product. Run the included KAOMA database upgrade first if a new field is reported missing.",
      );
    } finally {
      setUploading(false);
    }
  }
  async function remove(table: string, id: string) {
    if (!confirm("Permanently delete this item?")) return;
    await db(`${table}?id=eq.${id}`, token, { method: "DELETE" });
    await load(token);
  }
  async function orderStatus(id: string, status: string) {
    await db(`orders?id=eq.${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load(token);
  }
  async function reviewStatus(id: string, status: string) {
    await db(`reviews?id=eq.${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load(token);
  }
  function moveImage(index: number, direction: -1 | 1) {
    setProductImages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function makeMain(index: number) {
    setProductImages((current) => [
      current[index],
      ...current.filter((_, i) => i !== index),
    ]);
  }
  async function saveSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      logo = f.get("logo_file") as File,
      hero = f.get("hero_file") as File;
    setUploading(true);
    try {
      const logoUrl = logo?.size
          ? await uploadProductImage(logo, token)
          : String(f.get("logo_url")),
        heroUrl = hero?.size
          ? await uploadProductImage(hero, token)
          : String(f.get("hero_image_url"));
      const brand = {
          logo_url: logoUrl,
          announcement: String(f.get("announcement")),
          packaging_message: String(f.get("packaging_message")),
        },
        home = {
          hero_image_url: heroUrl,
          eyebrow: String(f.get("eyebrow")),
          heading: String(f.get("heading")),
          support_email: String(f.get("support_email")),
        };
      await Promise.all(
        [
          ["branding", brand],
          ["homepage", home],
        ].map(([key, value]) =>
          db("site_settings?on_conflict=key", token, {
            method: "POST",
            headers: {
              Prefer: "resolution=merge-duplicates,return=representation",
            },
            body: JSON.stringify({ key, value }),
          }),
        ),
      );
      setMsg("Homepage and branding settings saved.");
      await load(token);
    } finally {
      setUploading(false);
    }
  }
  async function saveCommerce(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      value = {
        base_currency: "INR",
        rates: {
          INR: 1,
          USD: Number(f.get("USD")),
          GBP: Number(f.get("GBP")),
          EUR: Number(f.get("EUR")),
          AED: Number(f.get("AED")),
          AUD: Number(f.get("AUD")),
          CAD: Number(f.get("CAD")),
          SGD: Number(f.get("SGD")),
        },
        shipping: {
          India: Number(f.get("ship_india")),
          International: Number(f.get("ship_international")),
          free_above: Number(f.get("free_above")),
        },
        payments: {
          provider: String(f.get("payment_provider")),
          enabled: f.get("payment_enabled") === "on",
          razorpay_key_id: String(f.get("razorpay_key_id")),
          phonepe_merchant_id: String(f.get("phonepe_merchant_id")),
        },
      };
    await db("site_settings?on_conflict=key", token, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ key: "commerce", value }),
    });
    setMsg("Global commerce settings saved.");
    await load(token);
  }
  function logout() {
    sessionStorage.removeItem("kaoma_admin_token");
    location.replace("/admin-login");
  }
  if (!ready)
    return (
      <main className="adminLoading">
        <div>
          <h1>KAOMA Administration</h1>
          <p>{msg || "Opening secure dashboard…"}</p>
          {msg && (
            <a className="primary" href="/admin-login">
              Return to login
            </a>
          )}
        </div>
      </main>
    );
  const menu = [
    ["overview", "Dashboard", ShoppingBag],
    ["orders", "Orders", ClipboardList],
    ["customers", "Customers", Users],
    ["categories", "Categories & Subcategories", FolderTree],
    ["products", "Products & Inventory", Boxes],
    ["reviews", "Customer Reviews", Star],
    ["branding", "Photos, Logo & Homepage", Settings],
    ["global", "Global Commerce", Globe2],
  ] as const;
  const page = sectionTitles[section];
  return (
    <main className="adminShell">
      <aside className="adminSidebar">
        <Link className="adminBrand" href="/admin/overview">
          <Image
            src="/kaoma-logo.webp"
            alt="KAOMA"
            width={180}
            height={55}
            priority
          />
          <small>PRIVATE ADMINISTRATION</small>
        </Link>
        <nav>
          {menu.map(([id, label, Icon]) => (
            <Link
              className={section === id ? "active" : ""}
              key={id}
              href={`/admin/${id}`}
            >
              <Icon />
              <span>{label}</span>
              {id === "customers" && customers.length > 0 && (
                <b>{customers.length}</b>
              )}
            </Link>
          ))}
          <a href="/" target="_blank">
            <Store />
            <span>View Store</span>
          </a>
          <button onClick={logout}>
            <LogOut />
            <span>Log Out</span>
          </button>
        </nav>
      </aside>
      <div className="adminMain">
        <header className="adminHeader">
          <div>
            <b>KAOMA</b>
            <span>Luxury commerce administration</span>
          </div>
          <a href="/" target="_blank">
            <Store />
            View store
          </a>
        </header>
        <section className="adminIntro">
          <p>{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <span>{page.description}</span>
          {msg && <div className="adminSuccess">{msg}</div>}
        </section>
        {section === "overview" && (
          <>
            <section className="adminStats">
              <article>
                <FolderTree />
                <b>{cats.length}</b>
                <span>Categories</span>
              </article>
              <article>
                <Boxes />
                <b>{products.length}</b>
                <span>Products</span>
              </article>
              <article>
                <ShoppingBag />
                <b>{orders.length}</b>
                <span>Orders</span>
              </article>
              <article>
                <Users />
                <b>{customers.length}</b>
                <span>Customers</span>
              </article>
            </section>
            <section className="adminQuickLinks">
              {menu.slice(1).map(([id, label, Icon]) => (
                <Link key={id} href={`/admin/${id}`}>
                  <Icon />
                  <span>
                    <b>{label}</b>
                    <small>Open management page</small>
                  </span>
                  <strong>→</strong>
                </Link>
              ))}
            </section>
          </>
        )}
        <section className="adminSections">
          {section === "orders" && (
            <article className="adminCard adminWide">
              <h2>Orders</h2>
              <div className="adminList">
                {orders.length ? (
                  orders.map((o) => (
                    <div key={o.id}>
                      <span>
                        <b>{o.order_number}</b>
                        <small>
                          {o.customer_email} · {o.currency} {o.total} · Payment{" "}
                          {o.payment_status}
                        </small>
                        {orderItems
                          .filter((item) => item.order_id === o.id)
                          .map((item) => (
                            <small key={item.id}>
                              {item.quantity}× {item.product_name} · Size{" "}
                              {item.selected_size || "Standard"} · Colour{" "}
                              {item.selected_colour || "As shown"}
                            </small>
                          ))}
                      </span>
                      <select
                        value={o.status}
                        onChange={(e) => void orderStatus(o.id, e.target.value)}
                      >
                        <option>pending</option>
                        <option>confirmed</option>
                        <option>packed</option>
                        <option>shipped</option>
                        <option>delivered</option>
                        <option>cancelled</option>
                      </select>
                    </div>
                  ))
                ) : (
                  <p>No customer orders yet.</p>
                )}
              </div>
            </article>
          )}
          {section === "customers" && (
            <article className="adminCard adminWide">
              <h2>Customers</h2>
              <div className="adminList">
                {customers.length ? (
                  customers.map((c) => (
                    <div key={c.user_id}>
                      <span>
                        <b>{c.full_name || "Customer"}</b>
                        <small>
                          {c.email || "No email"} · {c.phone || "No phone"} ·{" "}
                          {[
                            c.address_line1,
                            c.city,
                            c.region,
                            c.postal_code,
                            c.country,
                          ]
                            .filter(Boolean)
                            .join(", ") || "Address not added"}
                        </small>
                      </span>
                      <small>
                        {new Date(c.created_at).toLocaleDateString()}
                      </small>
                    </div>
                  ))
                ) : (
                  <p>No registered customers yet.</p>
                )}
              </div>
            </article>
          )}
          {section === "categories" && (
            <article className="adminCard adminWide">
              <h2>Categories & subcategories</h2>
              <div className="adminSplit">
                <form onSubmit={addCat}>
                  <input name="name" placeholder="Category name" required />
                  <button className="primary">Add category</button>
                </form>
                <form onSubmit={addSub}>
                  <select name="category" required>
                    <option value="">Parent category</option>
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input name="name" placeholder="Subcategory name" required />
                  <button className="primary">Add subcategory</button>
                </form>
              </div>
              <div className="adminList">
                {cats.map((c) => (
                  <div key={c.id}>
                    <span>
                      <b>{c.name}</b>
                      <small>
                        {subs
                          .filter((s) => s.category_id === c.id)
                          .map((s) => s.name)
                          .join(" · ") || "No subcategories"}
                      </small>
                    </span>
                    <button onClick={() => void remove("categories", c.id)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </article>
          )}
          {section === "products" && (
            <>
              <article className="adminCard productEditor">
                <h2>{edit ? "Edit product" : "Add complete product"}</h2>
                <form onSubmit={saveProduct}>
                  <input
                    name="name"
                    defaultValue={edit?.name}
                    placeholder="Product name"
                    required
                  />
                  <input
                    name="sku"
                    defaultValue={edit?.sku || ""}
                    placeholder="SKU / product code"
                  />
                  <input
                    name="short_description"
                    defaultValue={edit?.short_description || ""}
                    placeholder="Short selling line"
                  />
                  <textarea
                    name="description"
                    defaultValue={edit?.description || ""}
                    placeholder="Full product description"
                    required
                  />
                  <div className="adminTwo">
                    <input
                      name="material"
                      defaultValue={edit?.material || ""}
                      placeholder="Material / ingredients"
                    />
                    <input
                      name="care_instructions"
                      defaultValue={edit?.care_instructions || ""}
                      placeholder="Care or usage instructions"
                    />
                  </div>
                  <fieldset className="adminChoiceBox">
                    <legend>Show in multiple categories</legend>
                    {cats.map((c) => (
                      <label key={c.id}>
                        <input
                          name="categories"
                          type="checkbox"
                          value={c.id}
                          defaultChecked={(edit?.category_ids?.length
                            ? edit.category_ids
                            : [edit?.category_id]
                          ).includes(c.id)}
                        />
                        {c.name}
                      </label>
                    ))}
                  </fieldset>
                  <select
                    name="subcategory"
                    defaultValue={edit?.subcategory_id || ""}
                  >
                    <option value="">Optional subcategory</option>
                    {subs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <div className="adminTwo">
                    <input
                      name="price"
                      type="number"
                      step=".01"
                      defaultValue={edit?.price || ""}
                      placeholder="Base price in INR"
                    />
                    <input
                      name="compare"
                      type="number"
                      step=".01"
                      defaultValue={edit?.compare_at_price || ""}
                      placeholder="Compare price"
                    />
                  </div>
                  <div className="adminTwo">
                    <input
                      name="stock"
                      type="number"
                      min="0"
                      defaultValue={edit?.stock_quantity || 0}
                      placeholder="Stock"
                    />
                    <select
                      name="status"
                      defaultValue={edit?.status || "draft"}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Published</option>
                      <option value="sold_out">Sold out</option>
                    </select>
                  </div>
                  <input
                    name="sizes"
                    defaultValue={edit?.sizes?.join(", ") || ""}
                    placeholder="Optional clothing sizes: XS, S, M, L, XL"
                  />
                  <input
                    name="colours"
                    defaultValue={edit?.colours?.join(", ") || ""}
                    placeholder="Colour variants: Wine, Rose, Black (images map in the same order)"
                  />
                  <fieldset className="adminChoiceBox">
                    <legend>Related / similar products</legend>
                    {products
                      .filter((p) => p.id !== edit?.id)
                      .map((p) => (
                        <label key={p.id}>
                          <input
                            name="related_products"
                            type="checkbox"
                            value={p.id}
                            defaultChecked={edit?.related_product_ids?.includes(
                              p.id,
                            )}
                          />
                          {p.name}
                        </label>
                      ))}
                  </fieldset>
                  <label className="imageInput">
                    <ImagePlus />
                    <span>
                      Add main and gallery images
                      <small>
                        First image is main; following images map to colour
                        variants and promotion
                      </small>
                    </span>
                    <input
                      name="images"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                    />
                  </label>
                  {productImages.length > 0 && (
                    <div className="imageManager">
                      {productImages.map((url, index) => (
                        <div
                          key={`${url}-${index}`}
                          className={index === 0 ? "mainProductImage" : ""}
                        >
                          <div>
                            <Image
                              src={url}
                              alt={`Product image ${index + 1}`}
                              fill
                              sizes="110px"
                              unoptimized
                            />
                          </div>
                          <span>
                            {index === 0 ? "Main image" : `Gallery ${index}`}
                          </span>
                          <section>
                            <button
                              type="button"
                              onClick={() => makeMain(index)}
                            >
                              Main
                            </button>
                            <button
                              type="button"
                              onClick={() => moveImage(index, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveImage(index, 1)}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setProductImages((current) =>
                                  current.filter((_, i) => i !== index),
                                )
                              }
                            >
                              Remove
                            </button>
                          </section>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="adminChecks">
                    <label>
                      <input
                        name="enable_add_to_cart"
                        type="checkbox"
                        defaultChecked={edit?.enable_add_to_cart ?? true}
                      />
                      Add to cart
                    </label>
                    <label>
                      <input
                        name="enable_buy_now"
                        type="checkbox"
                        defaultChecked={edit?.enable_buy_now ?? true}
                      />
                      Buy now
                    </label>
                    <label>
                      <input
                        name="enable_wishlist"
                        type="checkbox"
                        defaultChecked={edit?.enable_wishlist ?? true}
                      />
                      Wishlist
                    </label>
                    <label>
                      <input
                        name="featured"
                        type="checkbox"
                        defaultChecked={edit?.featured}
                      />
                      Featured
                    </label>
                    <label>
                      <input
                        name="best_seller"
                        type="checkbox"
                        defaultChecked={edit?.best_seller}
                      />
                      Best seller
                    </label>
                    <label>
                      <input
                        name="new_arrival"
                        type="checkbox"
                        defaultChecked={edit?.new_arrival}
                      />
                      New arrival
                    </label>
                  </div>
                  <button className="primary" disabled={uploading}>
                    <PackagePlus />
                    {uploading
                      ? "Uploading images…"
                      : edit
                        ? "Save changes"
                        : "Add product"}
                  </button>
                  {edit && (
                    <button
                      type="button"
                      className="textButton"
                      onClick={() => setEdit(null)}
                    >
                      Cancel editing
                    </button>
                  )}
                </form>
              </article>
              <article className="adminCard productList">
                <h2>Products & inventory</h2>
                <div className="adminList">
                  {products.length ? (
                    products.map((p) => (
                      <div key={p.id}>
                        <span>
                          <b>{p.name}</b>
                          <small>
                            {p.status} · Stock {p.stock_quantity} ·{" "}
                            {p.price ? `₹${p.price}` : "No price"} ·{" "}
                            {p.image_urls?.length || 0} images ·{" "}
                            {p.category_ids?.length || Boolean(p.category_id)
                              ? 1
                              : 0}
                            + categories
                          </small>
                          <small>Share: kaoma.in/?product={slug(p.name)}</small>
                        </span>
                        <span className="rowActions">
                          <button onClick={() => setEdit(p)}>Edit</button>
                          <button onClick={() => void remove("products", p.id)}>
                            Delete
                          </button>
                        </span>
                      </div>
                    ))
                  ) : (
                    <p>No products added yet.</p>
                  )}
                </div>
              </article>
            </>
          )}
          {section === "reviews" && (
            <article className="adminCard adminWide">
              <h2>Customer reviews</h2>
              <div className="adminList">
                {reviews.length ? (
                  reviews.map((r) => (
                    <div key={r.id}>
                      <span>
                        <b>
                          {r.reviewer_name} · {"★".repeat(r.rating)}
                        </b>
                        <small>
                          {r.products?.name || "Product"} · {r.title || r.body}
                        </small>
                      </span>
                      <span className="reviewActions">
                        <select
                          value={r.status}
                          onChange={(e) =>
                            void reviewStatus(r.id, e.target.value)
                          }
                        >
                          <option>pending</option>
                          <option>approved</option>
                          <option>rejected</option>
                        </select>
                        <button onClick={() => void remove("reviews", r.id)}>
                          Delete
                        </button>
                      </span>
                    </div>
                  ))
                ) : (
                  <p>No customer reviews yet.</p>
                )}
              </div>
            </article>
          )}
          {section === "branding" && (
            <article className="adminCard adminWide">
              <h2>Photos, logo & homepage</h2>
              <form onSubmit={saveSettings} className="settingsForm">
                <label>
                  Current logo URL
                  <input
                    name="logo_url"
                    defaultValue={branding.logo_url || "/kaoma-logo.webp"}
                  />
                </label>
                <label>
                  Upload a new logo
                  <input
                    name="logo_file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                  />
                </label>
                <label>
                  Current hero image URL
                  <input
                    name="hero_image_url"
                    defaultValue={
                      homepage.hero_image_url || "/kamadeva-rati-hero.webp"
                    }
                  />
                </label>
                <label>
                  Upload a new homepage hero
                  <input
                    name="hero_file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                  />
                </label>
                <label>
                  Top announcement
                  <input
                    name="announcement"
                    defaultValue={
                      branding.announcement || "OPEN 24/7 — INCLUDING SUNDAYS"
                    }
                  />
                </label>
                <label>
                  Packaging message
                  <input
                    name="packaging_message"
                    defaultValue={
                      branding.packaging_message ||
                      "DISCREET PACKAGING · INDIA & INTERNATIONAL DELIVERY"
                    }
                  />
                </label>
                <label>
                  Homepage eyebrow
                  <input
                    name="eyebrow"
                    defaultValue={
                      homepage.eyebrow || "DESIRE · BEAUTY · CONNECTION"
                    }
                  />
                </label>
                <label>
                  Homepage heading
                  <input
                    name="heading"
                    defaultValue={
                      homepage.heading ||
                      "The art of pleasure, beautifully expressed."
                    }
                  />
                </label>
                <label>
                  Support email
                  <input
                    name="support_email"
                    type="email"
                    defaultValue={
                      homepage.support_email || "kaomaglobal@gmail.com"
                    }
                  />
                </label>
                <button className="primary" disabled={uploading}>
                  <Settings />
                  {uploading ? "Uploading…" : "Save storefront settings"}
                </button>
              </form>
            </article>
          )}
          {section === "global" && (
            <article className="adminCard adminWide">
              <h2>Global commerce settings</h2>
              <form onSubmit={saveCommerce} className="settingsForm">
                <p>
                  Enter how much one Indian rupee is worth in each display
                  currency. Update these fixed rates whenever required.
                </p>
                {["USD", "GBP", "EUR", "AED", "AUD", "CAD", "SGD"].map(
                  (code) => (
                    <label key={code}>
                      {code} conversion rate
                      <input
                        name={code}
                        type="number"
                        step="0.000001"
                        defaultValue={
                          (
                            commerce.rates as Record<string, number> | undefined
                          )?.[code] ||
                          {
                            USD: 0.012,
                            GBP: 0.0094,
                            EUR: 0.011,
                            AED: 0.044,
                            AUD: 0.018,
                            CAD: 0.016,
                            SGD: 0.016,
                          }[code as "USD"]
                        }
                        required
                      />
                    </label>
                  ),
                )}
                <label>
                  India shipping (INR)
                  <input
                    name="ship_india"
                    type="number"
                    defaultValue={
                      (commerce.shipping as Record<string, number> | undefined)
                        ?.India || 99
                    }
                  />
                </label>
                <label>
                  International shipping (INR)
                  <input
                    name="ship_international"
                    type="number"
                    defaultValue={
                      (commerce.shipping as Record<string, number> | undefined)
                        ?.International || 1499
                    }
                  />
                </label>
                <label>
                  Free shipping above (INR)
                  <input
                    name="free_above"
                    type="number"
                    defaultValue={
                      (commerce.shipping as Record<string, number> | undefined)
                        ?.free_above || 5000
                    }
                  />
                </label>
                <label>
                  Future payment provider
                  <select
                    name="payment_provider"
                    defaultValue={
                      (commerce.payments as Record<string, string> | undefined)
                        ?.provider || "manual"
                    }
                  >
                    <option value="manual">Payment pending / manual</option>
                    <option value="razorpay">Razorpay (future)</option>
                    <option value="phonepe">PhonePe (future)</option>
                  </select>
                </label>
                <label>
                  Razorpay public Key ID
                  <input
                    name="razorpay_key_id"
                    defaultValue={
                      (commerce.payments as Record<string, string> | undefined)
                        ?.razorpay_key_id || ""
                    }
                    placeholder="Add later — never paste a secret key here"
                  />
                </label>
                <label>
                  PhonePe Merchant ID
                  <input
                    name="phonepe_merchant_id"
                    defaultValue={
                      (commerce.payments as Record<string, string> | undefined)
                        ?.phonepe_merchant_id || ""
                    }
                    placeholder="Add later"
                  />
                </label>
                <label className="adminInlineCheck">
                  <input
                    name="payment_enabled"
                    type="checkbox"
                    defaultChecked={false}
                  />
                  Enable online payment only after its secure server integration
                  is completed
                </label>
                <button className="primary">
                  <Globe2 />
                  Save global settings
                </button>
              </form>
            </article>
          )}
        </section>
      </div>
    </main>
  );
}
