import type { Metadata } from "next";
import { CustomerPageShell } from "@/components/customer-page-shell";

export const metadata: Metadata = { title: "Terms and Conditions", description: "Terms governing purchases and use of the KAOMA website.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return <CustomerPageShell eyebrow="SHOPPING WITH KAOMA" title="Terms and conditions" intro="The terms that apply when you browse or purchase from KAOMA.">
    <article className="legalPage">
      <h2>Eligibility</h2><p>This website is intended only for adults aged 18 or older. By using it, you confirm that you meet the legal age requirement in your location.</p>
      <h2>Products and orders</h2><p>We aim to present accurate descriptions, images, pricing and availability. Colour and appearance may vary by screen. An order is accepted after successful payment and confirmation; we may cancel and refund an order affected by stock, pricing, verification or legal restrictions.</p>
      <h2>Pricing, delivery and duties</h2><p>Prices, delivery charges, estimated timelines and supported payment methods are shown before payment. International customers are responsible for destination taxes or customs duties unless checkout clearly states otherwise.</p>
      <h2>Accounts and acceptable use</h2><p>Keep access to your email account secure and provide accurate delivery information. Do not misuse the website, attempt unauthorised access, interfere with checkout, or use its content unlawfully.</p>
      <h2>Support</h2><p>Questions can be sent to <a href="mailto:kaomaglobal@gmail.com">kaomaglobal@gmail.com</a>. These terms are governed by applicable Indian law, subject to mandatory consumer rights in the customer’s location. Last updated: September 2026.</p>
    </article>
  </CustomerPageShell>;
}
