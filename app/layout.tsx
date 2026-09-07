import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Private Label — Global Clothing & Intimate Wellness",
  description: "A discreet, inclusive destination for elevated clothing and intimate wellness, delivering across India and internationally.",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
