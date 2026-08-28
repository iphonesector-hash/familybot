import ReminderShortcut from "./ReminderShortcut";
import OwnerGiftShortcut from "./OwnerGiftShortcut";
import AdminSessionBootstrap from "./AdminSessionBootstrap";

export default function AdminLayout({children}:{children:React.ReactNode}){return <><AdminSessionBootstrap/>{children}<ReminderShortcut/><OwnerGiftShortcut/></>}
