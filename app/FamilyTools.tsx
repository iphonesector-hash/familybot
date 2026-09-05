import Link from "next/link";

export default function FamilyTools(){
  return <nav className="premiumPanel" aria-label="ابزارهای خانواده" style={{padding:16,marginBottom:14}}>
    <h2 style={{fontSize:17,marginTop:0}}>ابزارهای خانواده</h2>
    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
      <Link className="primaryCta" href="/section/fund">صندوق خانوادگی</Link>
      <Link className="ghostCta" href="/section/tasks">کارهای خانواده</Link>
      <Link className="ghostCta" href="/section/planner">برنامه‌ریز</Link>
      <Link className="ghostCta" href="/section/memories">خاطرات</Link>
      <Link className="ghostCta" href="/section/occasions">مناسبت‌ها</Link>
      <Link className="ghostCta" href="/section/secret-gift">هدیه مخفی</Link>
      <Link className="ghostCta" href="/section/tools">ابزارهای کاربردی</Link>
    </div>
  </nav>;
}
