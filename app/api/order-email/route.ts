import {NextResponse} from "next/server";
import {sendOrderEmails} from "@/lib/order-email";

export async function POST(request:Request){
 const secret=process.env.ORDER_EMAIL_SECRET,provided=request.headers.get("x-order-email-secret"),bearer=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
 let authorised=Boolean(secret&&provided===secret);const url=process.env.NEXT_PUBLIC_SUPABASE_URL,publishableKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 let authenticatedEmail="";if(!authorised&&bearer&&url&&publishableKey){const auth=await fetch(`${url}/auth/v1/user`,{headers:{apikey:publishableKey,Authorization:`Bearer ${bearer}`}});if(auth.ok){const user=await auth.json();authenticatedEmail=String(user.email||"");authorised=true}}
 if(!authorised)return NextResponse.json({error:"Unauthorised"},{status:401});
 const body=await request.json();const customer=String(body.customerEmail||"");const order=String(body.orderNumber||"");if(!customer||!order)return NextResponse.json({error:"Missing order details"},{status:400});if(authenticatedEmail&&authenticatedEmail.toLowerCase()!==customer.toLowerCase())return NextResponse.json({error:"Email does not match signed-in customer"},{status:403});
 try{return NextResponse.json(await sendOrderEmails({customerEmail:customer,orderNumber:order}));}catch(error){console.error("[order-email] failed",{message:error instanceof Error?error.message:String(error)});return NextResponse.json({error:error instanceof Error?error.message:"Email delivery failed"},{status:503});}
}
