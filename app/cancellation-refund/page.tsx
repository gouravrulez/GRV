import type { Metadata } from "next";
import { CustomerPageShell } from "@/components/customer-page-shell";

export const metadata: Metadata = { title: "Cancellation and Refund Policy", description: "KAOMA cancellation, return and refund information.", alternates: { canonical: "/cancellation-refund" } };

export default function RefundPage() {
  return <CustomerPageShell eyebrow="CUSTOMER CARE" title="Cancellation and refund policy" intro="Clear, privacy-conscious help if an order needs attention.">
    <article className="legalPage">
      <h2>Cancellations</h2><p>Ask to cancel as soon as possible by emailing us with your order number. We can cancel before dispatch when operationally possible. Dispatched orders cannot normally be cancelled.</p>
      <h2>Damaged, defective or incorrect items</h2><p>Contact us within 48 hours of delivery with the order number and clear photos or video of the item and outer packaging. After verification, we will arrange an appropriate replacement, return or refund.</p>
      <h2>Hygiene-sensitive items</h2><p>For health and safety, opened, used, worn or unsealed intimate products are not returnable for change of mind. This does not limit remedies available for defective or incorrectly supplied goods under applicable law.</p>
      <h2>Refund timing</h2><p>Approved refunds are sent to the original payment method. Processing time depends on the payment provider and bank. Shipping or customs charges are refundable only where required by law or where the error was ours.</p>
      <h2>Request support</h2><p>Email <a href="mailto:kaomaglobal@gmail.com">kaomaglobal@gmail.com</a> with your order number. Do not send a parcel before receiving return instructions. Last updated: September 2026.</p>
    </article>
  </CustomerPageShell>;
}
