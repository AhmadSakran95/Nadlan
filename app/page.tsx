import Link from "next/link";
export default function Home() {
  return <><header className="topbar"><div className="brand">NADLAN TOURS</div><nav className="nav"><Link href="/admin/login">دخول الإدارة</Link><Link href="/portal/login">دخول الزبون</Link></nav></header>
  <main className="container"><section className="hero"><p>YOUR SMART TRAVEL COMPANION</p><h1 style={{fontSize:38,margin:"10px 0"}}>رحلتك تبدأ مع Nadlan Tours</h1><p style={{maxWidth:600,lineHeight:1.9}}>منصة ذكية لإدارة الحجوزات ومتابعة تفاصيل السفر، مع بوابة خاصة لكل مسافر.</p><div className="actions"><Link className="btn" href="/portal/login">عرض حجزي</Link><Link className="btn secondary" href="/admin/login">لوحة المكتب</Link></div></section>
  <div className="grid"><div className="card"><h3>✈️ تفاصيل الرحلة</h3><p className="muted">الطيران والفنادق والتوصيلات في مكان واحد.</p></div><div className="card"><h3>🌤️ معلومات الوجهة</h3><p className="muted">الطقس وأهم الأماكن السياحية.</p></div><div className="card"><h3>🤖 مساعد السفر</h3><p className="muted">مساعد ذكي لمرافقتك خلال رحلتك.</p></div></div></main><footer className="footer">© Nadlan Tours</footer></>;
}
