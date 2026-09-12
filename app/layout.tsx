import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://kaoma.in"),
  title: {
    default: "KAOMA — Clothing & Intimate Wellness",
    template: "%s | KAOMA",
  },
  description:
    "KAOMA is a discreet, inclusive destination for elevated clothing and intimate wellness, delivering across India and internationally.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "KAOMA — Clothing & Intimate Wellness",
    description:
      "Elegant pleasure dressing, intimate wellness and discreet delivery across India and internationally.",
    url: "https://kaoma.in",
    siteName: "KAOMA",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://checkout.razorpay.com" />
        <link rel="preconnect" href="https://api.razorpay.com" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
