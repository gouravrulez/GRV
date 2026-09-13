import Storefront from "@/components/storefront";

export default async function CategoryPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 return <Storefront initialCategorySlug={slug}/>;
}
