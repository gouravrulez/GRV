import type {ReactNode} from "react";
import {MessageCircle,PackageCheck} from "lucide-react";

export function CustomerPageShell({eyebrow,title,intro,children}:{eyebrow:string;title:string;intro:string;children:ReactNode}){
 return <main className="pageTop">
  <div className="announce"><b>OPEN 24/7 — INCLUDING SUNDAYS</b><i/><PackageCheck/> DISCREET PACKAGING · INDIA & INTERNATIONAL DELIVERY</div>
  <header className="simpleHeader"><a className="logo" href="/">BRAND<span>NAME</span></a><nav><a href="/">Home</a><a href="/categories">Categories</a><a href="/best-sellers">Best Sellers</a><a href="/about">About Us</a><a href="/contact">Contact Us</a></nav></header>
  <section className="pageHero"><p>{eyebrow}</p><h1>{title}</h1><span>{intro}</span></section>
  <section className="pageContent">{children}</section>
  <a className="floatingSocial" href="/contact" title="Chat with us" aria-label="Chat with us"><MessageCircle/></a>
  <div className="simpleFooter"><span>Private, respectful support for adults worldwide.</span><span><a href="/shipping">Delivery</a> · <a href="/returns">Returns</a> · <a href="/contact">Contact</a></span></div>
 </main>
}
