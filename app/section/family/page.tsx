import Link from "next/link";
import LiveSection from "../[slug]/LiveSection";
export default function FamilyPage(){return <><LiveSection slug="family"/><Link href="/section/tree" className="primaryCta" style={{position:"fixed",right:18,bottom:88,zIndex:20,boxShadow:"0 10px 35px rgba(91,48,180,.45)"}}>🌳 شجره‌نامه حرفه‌ای</Link></>}
