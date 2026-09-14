import { NextResponse } from "next/server";
import { authenticatedCustomer, serviceDb } from "@/lib/razorpay-server";
export async function POST(request: Request) {
  try {
    const { user } = await authenticatedCustomer(request);
    if (!user.email) throw new Error("Customer email unavailable.");
    const { items, total, currency, recovered } = await request.json();
    await serviceDb("abandoned_carts?on_conflict=email", {
      method:"POST", headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify({user_id:user.id,email:user.email,items:Array.isArray(items)?items.slice(0,50):[],cart_total:Number(total)||0,currency:String(currency||"INR").slice(0,3),recovered:Boolean(recovered),updated_at:new Date().toISOString(),reminder_sent_at:null})
    });
    return NextResponse.json({saved:true});
  } catch (error) { return NextResponse.json({error:error instanceof Error?error.message:"Unable to save cart."},{status:400}); }
}
