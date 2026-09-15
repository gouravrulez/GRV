import { NextResponse } from "next/server";
import { authenticatedCustomer, serviceDb } from "@/lib/razorpay-server";

const escapeHtml=(value:unknown)=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]||c));

export async function POST(request:Request){
 try{
  const {user}=await authenticatedCustomer(request);
  const admins=await serviceDb(`admins?user_id=eq.${user.id}&select=user_id&limit=1`);
  if(!admins?.length)return NextResponse.json({error:"Administrator access required."},{status:403});
  const {productId}=await request.json();
  if(!/^[0-9a-f-]{36}$/i.test(String(productId||"")))throw new Error("Invalid product.");
  const products=await serviceDb(`products?id=eq.${productId}&select=id,name,slug,stock_quantity&limit=1`);
  const product=products?.[0];
  if(!product||Number(product.stock_quantity)<1)return NextResponse.json({sent:0});
  const requests=await serviceDb(`stock_notifications?product_id=eq.${productId}&notified_at=is.null&select=id,email&limit=100`);
  const key=process.env.RESEND_API_KEY;
  if(!key)throw new Error("RESEND_API_KEY is missing.");
  const from=process.env.ORDER_EMAIL_FROM||"KAOMA <orders@kaoma.in>";
  let sent=0;
  for(const notice of requests||[]){
   const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","Idempotency-Key":`kaoma-stock-${notice.id}`},body:JSON.stringify({from,to:notice.email,subject:`${product.name} is back at KAOMA`,html:`<div style="font-family:Arial;color:#39243f;line-height:1.6;max-width:600px;margin:auto"><p style="letter-spacing:.2em;color:#c34368;font-weight:bold">KAOMA</p><h1 style="font-family:Georgia;color:#54233a">Back in stock</h1><p><b>${escapeHtml(product.name)}</b> is available again.</p><p><a href="https://kaoma.in/product/${encodeURIComponent(product.slug)}" style="display:inline-block;background:#b92c61;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px">View product</a></p><p>Availability may be limited. Customer support: kaomaglobal@gmail.com</p></div>`}),signal:AbortSignal.timeout(12000)});
   if(response.ok){sent++;await serviceDb(`stock_notifications?id=eq.${notice.id}`,{method:"PATCH",body:JSON.stringify({notified_at:new Date().toISOString()})});}
  }
  return NextResponse.json({sent});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to send stock notifications."},{status:400});}
}
