require('dotenv').config({ quiet: true });
require('ts-node').register({ transpileOnly:true, skipProject:true, compilerOptions:{ module:'CommonJS',target:'ES2022',moduleResolution:'Node' } });
const { db }=require('../packages/database/src/db.ts');
const { processEmailJobs }=require('../packages/database/src/services/email-outbox.ts');
const { sendEmail }=require('../packages/email/src/index.ts');
let stopped=false;
process.on('SIGINT',()=>{stopped=true});process.on('SIGTERM',()=>{stopped=true});
async function main(){
 if(!process.env.RESEND_API_KEY||!process.env.FROM_EMAIL)throw Error('Configure RESEND_API_KEY and verified FROM_EMAIL');
 do{ await processEmailJobs(sendEmail); if(process.argv.includes('--once'))break; if(!stopped)await new Promise(r=>setTimeout(r,10000)); }while(!stopped);
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
