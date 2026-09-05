"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";

export default function InternalNavigationBridge(){
  const router=useRouter();
  useEffect(()=>{
    const onClick=(event:MouseEvent)=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const target=event.target;
      if(!(target instanceof Element))return;
      const anchor=target.closest("a[href]");
      if(!(anchor instanceof HTMLAnchorElement)||anchor.target||anchor.hasAttribute("download")||anchor.dataset.noSpa==="1")return;
      const href=anchor.getAttribute("href")||"";
      if(!href||href.startsWith("#")||href.startsWith("mailto:")||href.startsWith("tel:"))return;
      const url=new URL(anchor.href,window.location.href);
      if(url.origin!==window.location.origin)return;
      event.preventDefault();
      router.push(`${url.pathname}${url.search}${url.hash}`);
    };
    document.addEventListener("click",onClick);
    return()=>document.removeEventListener("click",onClick);
  },[router]);
  return null;
}
