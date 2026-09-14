import { serviceDb } from "@/lib/razorpay-server";
const xml=(v:unknown)=>String(v??"").replace(/[<>&'"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c]||c));
export async function GET() {
  const products=await serviceDb("products?status=in.(active,published)&select=id,slug,name,description,price,stock_quantity,image_urls,brand,google_product_category");
  const items=(products||[]).map((p:any)=>`<item><g:id>${xml(p.id)}</g:id><title>${xml(p.name)}</title><description>${xml(p.description||p.name)}</description><link>https://kaoma.in/product/${xml(p.slug)}</link><g:image_link>${xml(p.image_urls?.[0]||"")}</g:image_link><g:availability>${p.stock_quantity>0?"in_stock":"out_of_stock"}</g:availability><g:price>${Number(p.price).toFixed(2)} INR</g:price><g:condition>new</g:condition><g:brand>${xml(p.brand||"KAOMA")}</g:brand><g:google_product_category>${xml(p.google_product_category||"Apparel & Accessories")}</g:google_product_category></item>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel><title>KAOMA Products</title><link>https://kaoma.in</link><description>KAOMA product catalogue</description>${items}</channel></rss>`,{headers:{"Content-Type":"application/xml; charset=utf-8","Cache-Control":"public, max-age=3600"}});
}
