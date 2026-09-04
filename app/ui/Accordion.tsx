"use client";
import {ReactNode,useId,useState} from "react";

export default function Accordion({
  title, summary, icon, defaultOpen=false, children
}:{title:string;summary?:string;icon?:ReactNode;defaultOpen?:boolean;children:ReactNode}){
  const [open,setOpen]=useState(defaultOpen);
  const id=useId();
  return (
    <section className={`jahaniAcc${open?" open":""}`}>
      <button type="button" className="jahaniAccHead" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(v=>!v)}>
        <span className="jahaniAccIcon">{icon||"✦"}</span>
        <span className="jahaniAccCopy">
          <b>{title}</b>
          {summary?<small>{summary}</small>:null}
        </span>
        <span className="jahaniAccChevron" aria-hidden>{open?"▾":"◂"}</span>
      </button>
      <div id={id} className="jahaniAccPanel" hidden={!open}>
        <div className="jahaniAccBody">{children}</div>
      </div>
    </section>
  );
}
