import Link from "next/link";

export default function NotFound() {
  return <main className="notFoundPage">
    <p>KAOMA · 404</p>
    <h1>This page slipped out of sight.</h1>
    <span>The collection may have moved, or the address may be incorrect.</span>
    <div><Link href="/">Return home</Link><Link href="/categories">Explore collections</Link></div>
  </main>;
}
