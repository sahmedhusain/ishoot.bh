"use server";
import {revalidatePath} from "next/cache";
import {isApiError,updateCompanyConfigurationForIT,completeCompanySetupForIT,saveCompanyAssetForIT,deleteCompanyAssetForIT,registerUpload,writeUpload,claimUpload,type CompanyConfigurationPatch} from "@platform/api-client";
import {asUser,requireAllowed} from "../../../lib/session";

type Reason="invalid"|"currencyLocked"|"sequenceBackwards"|"unavailable";
async function command<T>(run:()=>Promise<T>):Promise<{ok:true;value:T}|{ok:false;reason:Reason}>{
 try{return {ok:true,value:await run()}}catch(error){if(isApiError(error)&&(error.status===401||error.status===403))throw error;return {ok:false,reason:isApiError(error)?error.code==="company_currency_locked"?"currencyLocked":error.code==="sequence_backwards"?"sequenceBackwards":[400,422].includes(error.status)?"invalid":"unavailable":"unavailable"}}
}
export async function saveCompanyAction(values:CompanyConfigurationPatch){
 const user=await requireAllowed("setup","edit");const result=await asUser(()=>command(()=>updateCompanyConfigurationForIT(user.token,values)));if(result.ok){revalidatePath("/company");revalidatePath("/setup")}return result;
}
export async function finishCompanySetupAction(){
 const user=await requireAllowed("setup","execute");const result=await asUser(()=>command(()=>completeCompanySetupForIT(user.token)));if(result.ok){revalidatePath("/company");revalidatePath("/setup")}return result;
}
export async function removeCompanyAssetAction(key:string){
 const user=await requireAllowed("setup","edit");const result=await asUser(()=>command(()=>deleteCompanyAssetForIT(user.token,key)));if(result.ok)revalidatePath("/company");return result;
}
export async function uploadCompanyAssetAction(form:FormData){
 const user=await requireAllowed("setup","edit");
 const value=form.get("file"),key=form.get("key"),title=form.get("title");
 if(!(value instanceof File)||typeof key!=="string"||!/^[a-zA-Z0-9_-]{1,100}$/.test(key)||typeof title!=="string"||!title.trim()||title.length>500||value.size<1||value.size>10*1024*1024)return {ok:false as const,reason:"invalid" as const};
 const fonts:Record<string,string>={woff2:"font/woff2",woff:"font/woff",ttf:"font/ttf",otf:"font/otf"};
 const mime=fonts[value.name.split(".").pop()?.toLowerCase()??""]??value.type;
 if(!["image/png","image/jpeg","image/webp","image/gif",...Object.values(fonts)].includes(mime))return {ok:false as const,reason:"invalid" as const};
 return asUser(()=>command(async()=>{
  const privateArtwork=key==="stamp"||key==="signature";
  const upload=await registerUpload({ownerId:user.subject,folder:privateArtwork?"general":"brand",fileName:value.name,fileSize:value.size,mimeType:mime});
  await writeUpload(upload.fileUrl,user.subject,await value.arrayBuffer(),value.size);
  await claimUpload(upload.fileUrl,user.subject,{requirePrivate:privateArtwork});
  // shortcut: uncertain saves retain claimed files; reconcile references before orphan cleanup.
  await saveCompanyAssetForIT(user.token,key,title,upload.fileUrl);
  revalidatePath("/company");return {fileUrl:upload.fileUrl};
 }));
}
