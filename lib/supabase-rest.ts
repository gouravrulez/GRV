const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseReady = Boolean(url && key);

export async function signIn(email: string, password: string) {
  if (!url || !key) throw new Error("Supabase is not configured yet.");
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.msg || "Sign in failed.");
  return data as { access_token: string; user: { id: string; email?: string } };
}

export async function signUp(email:string,password:string,name:string){
 if(!url||!key)throw new Error("Supabase is not configured yet.");
 const response=await fetch(`${url}/auth/v1/signup`,{method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify({email,password,data:{full_name:name},options:{emailRedirectTo:"https://kaoma.in/account"}})});
 const data=await response.json();if(!response.ok)throw new Error(data.msg||data.error_description||"Account creation failed.");return data;
}
export async function resetPassword(email:string){
 if(!url||!key)throw new Error("Supabase is not configured yet.");
 const response=await fetch(`${url}/auth/v1/recover`,{method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify({email,gotrue_meta_security:{captcha_token:null}})});
 if(!response.ok)throw new Error((await response.json()).msg||"Reset request failed.");
}

export async function uploadProductImage(file:File,token:string){
 if(!url||!key)throw new Error("Supabase is not configured yet.");
 const safe=file.name.toLowerCase().replace(/[^a-z0-9.]+/g,"-"); const path=`${crypto.randomUUID()}-${safe}`;
 const response=await fetch(`${url}/storage/v1/object/product-images/${path}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${token}`,"Content-Type":file.type,"x-upsert":"false"},body:file});
 if(!response.ok)throw new Error((await response.text())||"Image upload failed.");return `${url}/storage/v1/object/public/product-images/${path}`;
}

export async function db(path: string, token = "", init: RequestInit = {}) {
  if (!url || !key) throw new Error("Supabase is not configured yet.");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token || key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error((await response.text()) || "Database request failed.");
  if (response.status === 204) return [];
  return response.json();
}
