import {notFound} from "next/navigation";
import AdminDashboard from "@/components/admin-dashboard";

const sections=["overview","orders","customers","categories","products","reviews","branding"] as const;
type Section=(typeof sections)[number];

export default async function AdminSectionPage({params}:{params:Promise<{section:string}>}){
  const {section}=await params;
  if(!sections.includes(section as Section))notFound();
  return <AdminDashboard section={section as Section}/>;
}
