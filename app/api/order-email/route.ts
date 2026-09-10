import {NextResponse} from "next/server";

export async function POST(request:Request){
 const secret=process.env.ORDER_EMAIL_SECRET,provided=request.headers.get("x-order-email-secret"),bearer=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
 let authorised=Boolean(secret&&provided===secret);const url=process.env.NEXT_PUBLIC_SUPABASE_URL,publishableKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 let authenticatedEmail="";if(!authorised&&bearer&&url&&publishableKey){const auth=await fetch(`${url}/auth/v1/user`,{headers:{apikey:publishableKey,Authorization:`Bearer ${bearer}`}});if(auth.ok){const user=await auth.json();authenticatedEmail=String(user.email||"");authorised=true}}
 if(!authorised)return NextResponse.json({error:"Unauthorised"},{status:401});
 const key=process.env.RESEND_API_KEY,from=process.env.ORDER_EMAIL_FROM||"KAOMA <orders@kaoma.in>",admin=process.env.ADMIN_ORDER_EMAIL||"kaomaglobal@gmail.com";if(!key)return NextResponse.json({error:"Email service is not configured"},{status:503});
 const body=await request.json();const customer=String(body.customerEmail||"");const order=String(body.orderNumber||"");if(!customer||!order)return NextResponse.json({error:"Missing order details"},{status:400});if(authenticatedEmail&&authenticatedEmail.toLowerCase()!==customer.toLowerCase())return NextResponse.json({error:"Email does not match signed-in customer"},{status:403});
 const html=`<div style="font-family:Arial;color:#39243f"><h1>Order confirmed</h1><p>Thank you for choosing KAOMA.</p><p><b>Order:</b> ${order.replace(/[<>&]/g,"")}</p><p>Your order will be prepared in discreet packaging. Tracking will be emailed when dispatched.</p></div>`;
 const results=await Promise.all([customer,admin].map(to=>fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","Idempotency-Key":`kaoma-order-${order}-${to}`},body:JSON.stringify({from,to,subject:`KAOMA order ${order} confirmed`,html})})));
 if(results.some(r=>!r.ok))return NextResponse.json({error:"Email delivery request failed"},{status:502});return NextResponse.json({sent:true});
}
