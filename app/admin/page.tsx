import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export default async function AdminPage(){
 if(!(await isAdmin())) redirect("/admin/login");
 const [customers,bookings,confirmed,pending]=await Promise.all([
  prisma.customer.count(),prisma.booking.count(),prisma.booking.count({where:{status:"CONFIRMED"}}),prisma.booking.count({where:{status:"UNCONFIRMED"}})
 ]);
 const recent=await prisma.booking.findMany({take:8,orderBy:{createdAt:"desc"},include:{customer:true}});
 return <><header className="topbar"><div className="brand">NADLAN / ADMIN</div><nav className="nav"><Link href="/admin/customers">الزبائن</Link><Link href="/admin/terms">الشروط</Link><form action="/api/admin/logout" method="post"><button className="btn secondary" formAction="/api/admin/logout">خروج</button></form></nav></header><main className="container"><div className="hero"><h1>لوحة التحكم</h1><p>مرحباً بك في نظام إدارة حجوزات Nadlan Tours.</p><Link className="btn" href="/admin/bookings/new">+ إضافة حجز جديد</Link></div><div className="grid"><div className="card"><p className="muted">إجمالي الزبائن</p><div className="stat">{customers}</div></div><div className="card"><p className="muted">إجمالي الحجوزات</p><div className="stat">{bookings}</div></div><div className="card"><p className="muted">حجوزات مؤكدة</p><div className="stat">{confirmed}</div></div><div className="card"><p className="muted">غير مؤكدة</p><div className="stat">{pending}</div></div></div><section className="section card"><h2>آخر الحجوزات</h2>{recent.length===0?<p className="muted">لا توجد حجوزات بعد.</p>:<table className="table"><thead><tr><th>PNR</th><th>الزبون</th><th>الوجهة</th><th>الحالة</th></tr></thead><tbody>{recent.map(b=><tr key={b.id}><td><Link href={`/admin/bookings/${b.id}`}>{b.pnr}</Link></td><td>{b.customer.firstName} {b.customer.lastName}</td><td>{b.destination}</td><td>{b.status==="CONFIRMED"?"مؤكد":"غير مؤكد"}</td></tr>)}</tbody></table>}</section></main></>;
}
