import ReminderShortcut from "./ReminderShortcut";
import OwnerGiftShortcut from "./OwnerGiftShortcut";

export default function AdminLayout({children}:{children:React.ReactNode}){return <>{children}<ReminderShortcut/><OwnerGiftShortcut/></>}
