"use client";
import dynamic from "next/dynamic";
import {useState} from "react";
import {Sparkles} from "lucide-react";
const Picker=dynamic(()=>import("./IconPicker").then(module=>module.IconPicker),{ssr:false,loading:()=> <p role="status">Loading icons…</p>});
export function IconPicker(props:{value:string;onChange:(value:string)=>void;placeholder?:string}){
 const [opened,setOpened]=useState(false);
 return opened ? <Picker {...props} initialOpen /> : <button type="button" onClick={()=>setOpened(true)} aria-haspopup="dialog" className="w-full flex items-center gap-2 border rounded-xl px-3 py-2 text-sm"><Sparkles aria-hidden="true" className="w-4 h-4" />{props.value || props.placeholder || "Select icon"}</button>;
}
