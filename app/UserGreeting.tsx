"use client";

import { useBaleMiniApp } from "../lib/useBaleMiniApp";

export default function UserGreeting(){
  const { user, inBale }=useBaleMiniApp();
  const name=user?.first_name?.trim();
  return <span>{inBale&&name?`سلام ${name}، خوش برگشتی`:"سلام، خوش برگشتی"} <em>💜</em></span>;
}
