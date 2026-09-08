import type { ReactNode } from "react";
import Image from "next/image";
import { MessageCircle, PackageCheck } from "lucide-react";

export function CustomerPageShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="pageTop">
      <div className="announce">
        <b>OPEN 24/7 — INCLUDING SUNDAYS</b>
        <i />
        <PackageCheck /> DISCREET PACKAGING · INDIA & INTERNATIONAL DELIVERY
      </div>
      <header className="simpleHeader">
        <a className="logo" href="/" aria-label="KAOMA home">
          <Image
            className="logoImage"
            src="/kaoma-logo.png"
            alt="KAOMA"
            width={1200}
            height={233}
            sizes="(max-width: 650px) 112px, 190px"
          />
        </a>
        <nav>
          <a href="/">Home</a>
          <a href="/categories">Categories</a>
          <a href="/best-sellers">Best Sellers</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact Us</a>
        </nav>
        <details className="simpleMobileMenu">
          <summary>Menu</summary>
          <div>
            <a href="/">Home</a>
            <a href="/categories">Categories</a>
            <a href="/best-sellers">Best Sellers</a>
            <a href="/account">Account</a>
            <a href="/contact">Contact</a>
          </div>
        </details>
      </header>
      <section className="pageHero">
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{intro}</span>
      </section>
      <section className="pageContent">{children}</section>
      <a
        className="floatingSocial"
        href="/contact"
        title="Chat with KAOMA"
        aria-label="Chat with KAOMA"
      >
        <MessageCircle />
      </a>
      <div className="simpleFooter">
        <span>KAOMA · Private, respectful support for adults worldwide.</span>
        <span>
          <a href="mailto:kaomaglobal@gmail.com">Email</a> ·{" "}
          <a
            href="https://www.instagram.com/kaoma.in/"
            target="_blank"
            rel="noreferrer"
          >
            Instagram
          </a>{" "}
          ·{" "}
          <a
            href="https://www.facebook.com/kaoma.in"
            target="_blank"
            rel="noreferrer"
          >
            Facebook
          </a>
        </span>
      </div>
    </main>
  );
}
