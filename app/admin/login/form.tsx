"use client";
import { useState } from "react";
export default function LoginForm(){
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState("");
 async function submit(e:React.FormEvent){e.preventDefault();setError("");const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});if(r.ok)location.href="/admin";else setError("بيانات الدخول غير صحيحة.");}
 return <form onSubmit={submit}><label>البريد الإلكتروني</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/><label>كلمة المرور</label><input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<p className="error">{error}</p>}<div className="actions"><button className="btn">دخول</button></div></form>;
}
