"use client";
import {useEffect,useState} from "react";
export default function BuildMarker(){const[visible,setVisible]=useState(false);useEffect(()=>setVisible(new URLSearchParams(location.search).get("debug")==="1"),[]);if(!visible)return null;const sha=process.env.NEXT_PUBLIC_BUILD_SHA||"unknown",stamp=process.env.NEXT_PUBLIC_BUILD_TIME||"unknown";return <aside className="buildMarker" data-testid="build-marker" aria-label="نسخه برنامه"><b>Build {sha.slice(0,12)}</b><span>{stamp}</span></aside>}
