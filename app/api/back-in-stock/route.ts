import { NextResponse } from "next/server";
import { serviceDb } from "@/lib/razorpay-server";
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export async function POST(request:Request){
 try{
  const {productId,email}=await request.json();
  const cleanEmail=String(email||"").trim().toLowerCase();
  if(!/^[0-9a-f-]{36}$/i.test(String(productId||""))||!emailPattern.test(cleanEmail)) throw new Error("Enter a valid email address.");
  await serviceDb("stock_notifications?on_conflict=product_id,email",{method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify({product_id:productId,email:cleanEmail})});
  return NextResponse.json({saved:true});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to save notification."},{status:400});}
}
