"use client";

import { useEffect, useState } from "react";
import { db, supabaseReady } from "@/lib/supabase-rest";

type Business = { business_name?:string; business_address?:string; support_email?:string; support_phone?:string; grievance_contact?:string };
const updated = "13 September 2026";

const policies: Record<string, { title:string; body:string }[]> = {
  shipping: [
    { title:"Order processing", body:"Orders are processed after successful payment and verification. Processing and dispatch estimates shown on the product or checkout page are estimates, not guarantees. Delays may occur during holidays, high-volume periods, address verification or events outside our reasonable control." },
    { title:"India and international delivery", body:"Available delivery methods, estimated charges and the final payable amount are displayed before payment. International availability varies by product and destination. Customers must provide a complete, accurate and serviceable delivery address." },
    { title:"Tracking and delivery", body:"Tracking information is added to the customer account after dispatch when available. A shipment may require identity, age or signature verification. Risk passes as permitted by applicable law after confirmed delivery to the supplied address." },
    { title:"Delivery problems", body:"Report a damaged package, missing item, incorrect item or delivery marked complete but not received as soon as possible, with the order number and supporting photographs where relevant." },
  ],
  duties: [
    { title:"Import charges", body:"International orders may attract customs duty, import tax, handling charges or local levies imposed by the destination. Unless checkout expressly states otherwise, these amounts are not included in the KAOMA price and are the recipient’s responsibility." },
    { title:"Customs information", body:"Customers authorise KAOMA and its delivery partners to provide order and recipient information reasonably required for customs clearance. Incorrect or incomplete information may cause delay, return or additional charges." },
    { title:"Refused international deliveries", body:"If an order is refused, abandoned or returned because import charges were unpaid or clearance information was not supplied, any refund permitted by law may be reduced by outbound delivery, return delivery, duties and other unrecoverable costs." },
  ],
  returns: [
    { title:"Seven-day problem-reporting period", body:"Contact KAOMA within 7 days of delivery if an item is damaged, defective, materially different from its description or incorrect. Include the order number, a clear explanation, photographs and an unboxing video where reasonably available. This period does not limit non-waivable rights under applicable consumer law." },
    { title:"Hygiene-sensitive products", body:"For health, hygiene and safety reasons, intimate products, personal-care products, lingerie or other hygiene-sensitive goods cannot be returned after their seal, protective packaging or hygiene strip has been opened, removed, damaged or used, unless the product is defective or a remedy is required by law." },
    { title:"Eligible unopened returns", body:"An unopened, unused and resalable item may be accepted only after written approval. It must retain all seals, labels, accessories, manuals and original packaging. Do not send a product before receiving return instructions." },
    { title:"Cancellation and refunds", body:"An order may be cancelled before it is packed or dispatched. After dispatch, cancellation is not guaranteed. Approved refunds are returned to the original payment method after inspection and may take the payment provider’s normal processing time. Delivery or import charges are refundable only when required by law or when KAOMA made the error." },
  ],
  privacy: [
    { title:"Information we collect", body:"We collect information you provide, including name, email, phone number, age confirmation, delivery and billing details, account preferences, support messages, reviews and order information. Payment credentials are processed by the payment provider; KAOMA does not intentionally store complete card or UPI credentials." },
    { title:"How information is used", body:"Information is used to create and secure accounts, process payments and orders, arrange delivery, provide support, prevent fraud, meet legal obligations, improve the store and send transactional communications. Marketing is sent only where permitted and can be opted out of." },
    { title:"Sharing and international processing", body:"Necessary information may be shared with hosting, database, authentication, email, analytics, payment, fraud-prevention, logistics, professional and government service providers. Because KAOMA serves customers internationally, information may be processed outside the customer’s region subject to appropriate safeguards and applicable law." },
    { title:"Retention, security and choices", body:"We retain information only as long as reasonably necessary for the stated purposes, legal compliance, disputes and fraud prevention. Reasonable technical and organisational safeguards are used, but no online system is completely risk-free. Customers may request access, correction or deletion where applicable by contacting KAOMA." },
    { title:"Cookies and account security", body:"Essential browser storage and cookies may be used for age confirmation, authentication, cart, preferences and security. Customers are responsible for protecting access to their email account and devices and should report suspected unauthorised access promptly." },
  ],
  terms: [
    { title:"Eligibility and acceptance", body:"By using KAOMA, you confirm that you are at least 18 years old, legally capable of entering a contract and permitted to purchase the selected products in your location. These terms apply with the policies linked on this site and mandatory consumer rights." },
    { title:"Products and responsible use", body:"Product information is provided for general retail information and is not medical advice. Read all labels, warnings, material, sizing, care and usage instructions. Stop use and seek appropriate professional advice if irritation, injury or another adverse reaction occurs." },
    { title:"Prices, orders and payment", body:"Prices, availability, currency conversions and promotions may change before an order is accepted. An order is confirmed only after successful payment and KAOMA’s acceptance. KAOMA may refuse or cancel orders affected by fraud concerns, obvious pricing errors, stock errors, delivery restrictions or legal requirements, with an appropriate refund." },
    { title:"Accounts and acceptable use", body:"Customers must provide accurate information and must not misuse the website, interfere with security, copy protected content, submit unlawful reviews or purchase for prohibited use. KAOMA may restrict access where reasonably necessary to protect customers or the service." },
    { title:"Liability and governing principles", body:"Nothing excludes liability or remedies that cannot legally be excluded. To the extent permitted by law, KAOMA is not responsible for indirect loss or loss caused by misuse, inaccurate customer information, third-party networks, customs action or events outside reasonable control. Disputes are subject to applicable Indian law and the mandatory rights of the customer’s jurisdiction." },
  ],
  "adult-policy": [
    { title:"Strictly 18+", body:"KAOMA is intended only for adults aged 18 years or older. By entering, registering or ordering, customers confirm they meet this requirement and any higher legal age applicable at their location." },
    { title:"Age and delivery verification", body:"KAOMA or its service providers may request reasonable age or identity verification and may cancel an order if eligibility cannot be confirmed. Customers must not order for, show restricted content to or facilitate access by a minor." },
    { title:"Consent and wellbeing", body:"KAOMA supports informed, consensual and lawful adult relationships. Products must never be used without freely given consent, contrary to instructions, or in any unlawful, coercive or harmful manner." },
  ],
  packaging: [
    { title:"Plain outer packaging", body:"Orders are packed in plain external packaging without product descriptions or intimate imagery. Shipping labels contain only information required for delivery, carrier operations, payment-on-delivery where applicable and legal compliance." },
    { title:"Private communications", body:"Transactional emails and account updates use neutral wording where practical. Customers remain responsible for the privacy of the email address, phone number and delivery location they provide." },
    { title:"International requirements", body:"Customs declarations and carrier documentation may be legally required to identify the nature, quantity or value of goods. KAOMA cannot conceal information required by customs, tax, safety or transport law." },
  ],
};

export function LegalPage({ page }: { page:string }) {
  const [business,setBusiness]=useState<Business>({support_email:"kaomaglobal@gmail.com",business_name:"KAOMA"});
  useEffect(()=>{ if(supabaseReady) db("site_settings?select=value&key=eq.homepage").then((rows)=>setBusiness({...business,...(rows?.[0]?.value||{})})).catch(()=>undefined); },[]);
  const sections=policies[page]||[];
  return <div className="legalPage">
    <p className="policyUpdated">Last updated: {updated}</p>
    {sections.map(section=><section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}
    <section className="legalContact"><h2>Contact and grievance support</h2><p><b>{business.business_name || "KAOMA"}</b>{business.business_address && <><br/>{business.business_address}</>}{business.support_phone && <><br/>{business.support_phone}</>}<br/><a href={`mailto:${business.support_email || "kaomaglobal@gmail.com"}`}>{business.support_email || "kaomaglobal@gmail.com"}</a>{business.grievance_contact && <><br/>Grievance contact: {business.grievance_contact}</>}</p></section>
  </div>;
}
