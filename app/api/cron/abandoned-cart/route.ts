import { NextResponse } from "next/server";
import { serviceDb } from "@/lib/razorpay-server";
export async function GET(request:Request) {
  if (process.env.CRON_SECRET && request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({error:"Unauthorized"},{status:401});
  const cutoff=new Date(Date.now()-2*60*60*1000).toISOString();
  const carts=await serviceDb(`abandoned_carts?recovered=eq.false&reminder_sent_at=is.null&updated_at=lt.${encodeURIComponent(cutoff)}&select=*&limit=50`);
  const key=process.env.RESEND_API_KEY, from=process.env.ORDER_EMAIL_FROM||"KAOMA <orders@kaoma.in>";
  if(!key) return NextResponse.json({error:"RESEND_API_KEY missing"},{status:500});
  let sent=0;
  for(const cart of carts||[]) {
    const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:cart.email,subject:"Your KAOMA selection is waiting",html:`<div style="font-family:Arial;color:#39243f;line-height:1.6"><h1 style="font-family:Georgia;color:#54233a">Your private bag is waiting</h1><p>You left a selection in your KAOMA bag. Return whenever you are ready.</p><p><a href="https://kaoma.in" style="background:#b92c61;color:white;padding:12px 18px;text-decoration:none;border-radius:6px">Return to KAOMA</a></p><p>Questions? kaomaglobal@gmail.com</p></div>`})});
    if(response.ok){sent++;await serviceDb(`abandoned_carts?id=eq.${cart.id}`,{method:"PATCH",body:JSON.stringify({reminder_sent_at:new Date().toISOString()})});}
  }
  return NextResponse.json({sent});
}
