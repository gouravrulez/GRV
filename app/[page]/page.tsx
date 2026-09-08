import { notFound } from "next/navigation";
import { CustomerPageShell } from "@/components/customer-page-shell";

const pages = {
  categories: {
    eyebrow: "EXPLORE",
    title: "Shop by category",
    intro:
      "Browse our focused edits for dressing, pleasure, connection and discreet gifting.",
    kind: "categories",
  },
  "best-sellers": {
    eyebrow: "CUSTOMER FAVOURITES",
    title: "Best sellers",
    intro:
      "Our most-loved products will appear here once the first collection is added.",
    kind: "empty",
  },
  about: {
    eyebrow: "OUR PHILOSOPHY",
    title: "Pleasure, approached beautifully",
    intro:
      "We are creating an inclusive destination for adults that brings together intimate dressing, thoughtful wellness, privacy and informed choice.",
    kind: "about",
  },
  contact: {
    eyebrow: "PRIVATE SUPPORT",
    title: "Contact KAOMA",
    intro:
      "Ask us about products, sizing, delivery or privacy. Our team is available by email and social media.",
    kind: "contact",
  },
  wishlist: {
    eyebrow: "SAVED FOR LATER",
    title: "Your wishlist",
    intro:
      "Products you save will appear here after customer accounts and the collection are connected.",
    kind: "empty",
  },
  account: {
    eyebrow: "CUSTOMER ACCOUNT",
    title: "Sign in or create an account",
    intro:
      "Customer authentication will be securely connected to the new business database before launch.",
    kind: "account",
  },
  guides: {
    eyebrow: "PLEASURE & WELLNESS",
    title: "Thoughtful guides",
    intro:
      "Clear, inclusive guidance on intimate wellness, confident dressing, comfort, care and body-safe choices.",
    kind: "guides",
  },
  shipping: {
    eyebrow: "INDIA & INTERNATIONAL",
    title: "Worldwide delivery",
    intro:
      "Discreet tracked delivery is planned for India and supported international destinations. Live rates will be shown at checkout.",
    kind: "shipping",
  },
  duties: {
    eyebrow: "INTERNATIONAL ORDERS",
    title: "Customs and duties",
    intro:
      "Import taxes and customs charges vary by destination. Country-specific information will be displayed before international checkout.",
    kind: "duties",
  },
  returns: {
    eyebrow: "CUSTOMER CARE",
    title: "Shipping and returns",
    intro:
      "A clear hygiene-conscious return policy and destination-specific delivery terms will be published before sales begin.",
    kind: "returns",
  },
  "order-tracking": {
    eyebrow: "YOUR ORDER",
    title: "Track an order",
    intro:
      "Tracking will activate when the order database and delivery provider are connected.",
    kind: "tracking",
  },
} as const;

const categories = [
  "For Women",
  "For Men",
  "Golden Night",
  "Foreplay",
  "Unique Gifts",
];

export function generateStaticParams() {
  return Object.keys(pages).map((page) => ({ page }));
}

export default async function InfoPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const data = pages[page as keyof typeof pages];
  if (!data) notFound();
  return (
    <CustomerPageShell
      eyebrow={data.eyebrow}
      title={data.title}
      intro={data.intro}
    >
      {data.kind === "categories" && (
        <div className="pageGrid">
          {categories.map((x) => (
            <a
              className="pageCard"
              href={"/category/" + x.toLowerCase().replaceAll(" ", "-")}
              key={x}
            >
              <h2>{x}</h2>
              <p>
                Open this collection and view matching products when they are
                added.
              </p>
            </a>
          ))}
        </div>
      )}
      {data.kind === "about" && (
        <div className="pageGrid">
          <article className="pageCard">
            <h2>Premium and discreet</h2>
            <p>
              Thoughtful presentation, private communication and plain delivery
              packaging.
            </p>
          </article>
          <article className="pageCard">
            <h2>Inclusive by design</h2>
            <p>
              Created for adults across identities, bodies and relationships.
            </p>
          </article>
          <article className="pageCard">
            <h2>Informed pleasure</h2>
            <p>
              Clear product information centred on consent, comfort and
              wellbeing.
            </p>
          </article>
        </div>
      )}
      {data.kind === "contact" && (
        <div className="contactForm">
          <article className="pageCard">
            <h2>Email KAOMA</h2>
            <p>For private customer support and general enquiries.</p>
            <a className="primary" href="mailto:kaomaglobal@gmail.com">
              kaomaglobal@gmail.com
            </a>
          </article>
          <article className="pageCard">
            <h2>Follow and message us</h2>
            <p>
              <a
                href="https://www.instagram.com/kaoma.in/"
                target="_blank"
                rel="noreferrer"
              >
                Instagram · @kaoma.in
              </a>
            </p>
            <p>
              <a
                href="https://www.facebook.com/kaoma.in"
                target="_blank"
                rel="noreferrer"
              >
                Facebook · kaoma.in
              </a>
            </p>
          </article>
        </div>
      )}
      {data.kind === "account" && (
        <form className="contactForm">
          <label>
            Email
            <input type="email" placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input type="password" placeholder="••••••••" />
          </label>
          <button type="button" className="primary">
            Sign in securely
          </button>
          <a href="/contact">Need help with your account?</a>
        </form>
      )}
      {data.kind === "guides" && (
        <div className="pageGrid">
          <article className="pageCard">
            <h2>Intimate wellness</h2>
            <p>
              Choosing thoughtfully and understanding materials, care and
              comfort.
            </p>
          </article>
          <article className="pageCard">
            <h2>Confident dressing</h2>
            <p>
              Finding styles and fits that help you feel comfortable and
              expressive.
            </p>
          </article>
          <article className="pageCard">
            <h2>Privacy and care</h2>
            <p>
              Discreet shopping, safe storage, cleaning and respectful
              communication.
            </p>
          </article>
        </div>
      )}
      {["shipping", "duties", "returns", "tracking"].includes(data.kind) && (
        <div className="pageGrid">
          <article className="pageCard">
            <h2>Clear information before payment</h2>
            <p>
              Final costs, delivery estimates and applicable conditions will be
              shown before an order is confirmed.
            </p>
          </article>
          <article className="pageCard">
            <h2>Private packaging</h2>
            <p>
              Orders will use discreet outer packaging and privacy-conscious
              communication.
            </p>
          </article>
          <article className="pageCard">
            <h2>Need assistance?</h2>
            <p>
              <a href="/contact">Contact our private customer-support team.</a>
            </p>
          </article>
        </div>
      )}
      {data.kind === "empty" && (
        <div className="emptyPage">
          <h2>This page is ready</h2>
          <p>
            It will populate automatically after products and customer accounts
            are added.
          </p>
          <a className="primary" href="/categories">
            Explore categories
          </a>
        </div>
      )}
    </CustomerPageShell>
  );
}
