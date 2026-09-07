import {notFound} from "next/navigation";
import {CustomerPageShell} from "@/components/customer-page-shell";

const names={"for-women":"For Women","for-men":"For Men","golden-night":"Golden Night",foreplay:"Foreplay","unique-gifts":"Unique Gifts"} as const;
export function generateStaticParams(){return Object.keys(names).map(slug=>({slug}))}
export default async function CategoryPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const name=names[slug as keyof typeof names]; if(!name)notFound();
 return <CustomerPageShell eyebrow="COLLECTION" title={name} intro={`Explore the ${name} collection. Products, photographs and prices will be added later through the separate administration system.`}>
  <div className="emptyPage"><h2>The collection is being prepared</h2><p>This dedicated category page is active and ready for products.</p><a className="primary" href="/categories">View all categories</a></div>
 </CustomerPageShell>
}
