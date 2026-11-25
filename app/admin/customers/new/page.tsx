import {redirect} from "next/navigation";import {isAdmin} from "@/lib/auth";import CustomerForm from "./form";
export default async function NewCustomer(){if(!(await isAdmin()))redirect("/admin/login");return <main className="container" style={{maxWidth:700}}><div className="card"><h1>إضافة زبون</h1><CustomerForm/></div></main>}
