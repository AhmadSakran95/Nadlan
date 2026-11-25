import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import LoginForm from "./form";
export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return <main className="container" style={{maxWidth:480}}><div className="card" style={{marginTop:70}}><h1>NADLAN TOURS</h1><h2>دخول الإدارة</h2><p className="muted">سجّل الدخول لإدارة العملاء والحجوزات.</p><LoginForm/></div></main>;
}
