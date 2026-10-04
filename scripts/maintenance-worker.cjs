// Expired pending uploads only; never removes claimed files or accepted email evidence.
require('dotenv').config({quiet:true});
require('ts-node').register({transpileOnly:true,skipProject:true,compilerOptions:{module:'CommonJS',target:'ES2022',moduleResolution:'Node',esModuleInterop:true}});
const path=require('node:path'),fs=require('node:fs/promises');
const {db}=require('../packages/database/src/db.ts');const {uploadRoot}=require('../packages/database/src/services/uploads.ts');
let stopped=false;process.on('SIGINT',()=>stopped=true);process.on('SIGTERM',()=>stopped=true);
async function pass(){
 const root=uploadRoot();let removed=0;
 await db.$transaction(async tx=>{
  const rows=await tx.$queryRaw`SELECT id,"fileUrl" FROM "UploadObject" WHERE "claimedAt" IS NULL AND "isPublic"=false AND "expiresAt"<CURRENT_TIMESTAMP ORDER BY "expiresAt" LIMIT 25 FOR UPDATE SKIP LOCKED`;
  for(const row of rows){if(!/^\/api\/files\/[a-z]+\/[a-zA-Z0-9_-]+\.(pdf|png|jpg|jpeg|webp)$/.test(row.fileUrl))throw Error('Invalid pending upload path requires manual inspection');
   const relative=row.fileUrl.slice('/api/files/'.length),filename=path.resolve(root,relative);if(!filename.startsWith(path.resolve(root)+path.sep))throw Error('Invalid upload containment');
   try{const canonicalRoot=await fs.realpath(root),canonicalFile=await fs.realpath(filename);if(!canonicalFile.startsWith(canonicalRoot+path.sep))throw Error('Upload escaped storage root');await fs.unlink(canonicalFile);}catch(error){if(error.code!=='ENOENT')throw error;}
   await tx.uploadObject.delete({where:{id:row.id}});removed++;
  }
 },{timeout:15000});
 const [abuse,sessions]=await Promise.all([db.abuseWindow.deleteMany({where:{expiresAt:{lt:new Date(Date.now()-86400000)}}}),db.session.deleteMany({where:{expiresAt:{lt:new Date()}}})]);
 console.log(JSON.stringify({event:'maintenance',expiredUploadsRemoved:removed,expiredAbuseWindowsRemoved:abuse.count,expiredSessionsRemoved:sessions.count}));
}
async function main(){do{await pass();if(process.argv.includes('--once'))break;if(!stopped)await new Promise(r=>setTimeout(r,60000));}while(!stopped);}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
