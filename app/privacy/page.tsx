import type { Metadata } from "next";
import { CustomerPageShell } from "@/components/customer-page-shell";

export const metadata: Metadata = { title: "Privacy Policy", description: "How KAOMA collects, uses and protects customer information.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return <CustomerPageShell eyebrow="YOUR PRIVACY" title="Privacy policy" intro="How KAOMA handles information when you browse, create an account or place an order.">
    <article className="legalPage">
      <h2>Information we collect</h2><p>We may collect your name, email address, telephone number, delivery and billing address, order details, account activity, support messages, and limited technical information needed to operate and secure the website.</p>
      <h2>How we use it</h2><p>We use information to authenticate accounts, process and deliver orders, send transactional messages, provide support, prevent fraud, improve the store, and meet legal or tax obligations.</p>
      <h2>Payments and service providers</h2><p>Payments are processed by Razorpay or another payment provider shown at checkout. KAOMA does not store complete card details. We may use service providers for hosting, authentication, email, storage, analytics and delivery, sharing only the information needed for those services.</p>
      <h2>Your choices</h2><p>You may request access, correction or deletion of eligible personal information by emailing <a href="mailto:kaomaglobal@gmail.com">kaomaglobal@gmail.com</a>. Some records may be retained where required for orders, fraud prevention, tax or legal compliance.</p>
      <h2>Security and updates</h2><p>We use reasonable safeguards, but no online service can guarantee absolute security. This policy may be updated as our services or legal requirements change. Last updated: September 2026.</p>
    </article>
  </CustomerPageShell>;
}
