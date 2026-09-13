import type { Metadata } from "next";
import { ReviewerLogin } from "@/components/reviewer-login";

export const metadata: Metadata = {
  title: "Checkout Review Access",
  robots: { index: false, follow: false, nocache: true },
};

export default function RazorpayReviewPage() {
  return <ReviewerLogin />;
}
