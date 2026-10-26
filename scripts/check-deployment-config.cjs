// Read-only configuration validation. Never prints connection strings or secret values.
require('dotenv').config({quiet:true});
const failures=[];const need=(ok,message)=>{if(!ok)failures.push(message);};
let url;try{url=new URL(process.env.DATABASE_URL);}catch{failures.push('DATABASE_URL must be a PostgreSQL URL');}
if(url){need(['postgres:','postgresql:'].includes(url.protocol),'Use a PostgreSQL connection');need(Number(url.searchParams.get('connection_limit'))>0,'Set an explicit per-process connection_limit in DATABASE_URL');need(Number(url.searchParams.get('pool_timeout'))>0,'Set a finite pool_timeout in DATABASE_URL');if(!['localhost','127.0.0.1'].includes(url.hostname))need(['require','verify-full'].includes(url.searchParams.get('sslmode')),'Require database TLS and verify the provider certificate policy');}
need(Buffer.byteLength(process.env.JWT_SECRET||'')>=32,'JWT_SECRET must contain at least 32 UTF-8 bytes');
need(Buffer.from(process.env.MFA_ENCRYPTION_KEY||'','base64').length===32,'Set a separate 32-byte base64 MFA_ENCRYPTION_KEY');
need(!!process.env.REVALIDATION_SECRET,'Configure REVALIDATION_SECRET in both apps and the worker');
need(!!process.env.SUPABASE_URL,'Configure SUPABASE_URL for server-side object storage');
need(!!process.env.SUPABASE_SERVICE_ROLE_KEY,'Configure SUPABASE_SERVICE_ROLE_KEY on the server only');
need(Buffer.byteLength(process.env.ENCRYPTION_KEY||'', 'utf8')===32,'Set a separate 32-byte ENCRYPTION_KEY for integrations');
need(!!process.env.CRON_SECRET,'Configure CRON_SECRET for authenticated maintenance');
need(!process.env.TRUSTED_CLIENT_IP_HEADER||/^[a-z0-9-]{1,80}$/.test(process.env.TRUSTED_CLIENT_IP_HEADER),'Trusted ingress header name is invalid');
async function finish() {
 require('ts-node').register({transpileOnly:true,skipProject:true,compilerOptions:{module:'CommonJS',target:'ES2022',moduleResolution:'Node',esModuleInterop:true,resolveJsonModule:true}});
 const {db}=require('../packages/database/src/db.ts');
 try {
  const {getResendCredentials}=require('../packages/email/src/index.ts');
  const mail=await getResendCredentials();
  need(!!mail?.apiKey&&!!mail.fromEmail,'Configure an active encrypted Resend integration with a verified sender (or legacy environment keys)');
  need(!!mail?.webhookSecret,'Configure the Resend webhook signing secret in the active integration');
 } catch { failures.push('Could not validate mail settings; check database connectivity and the integration encryption key'); }
 finally { await db.$disconnect(); }
for(const item of failures)console.error('FAIL: '+item);
console.log(JSON.stringify({checksFailed:failures.length,productionValidated:false,manualChecks:['Total pool budget across apps, workers and replicas','Ingress must overwrite the trusted header and block backend bypass','Supabase buckets: private-assets is private; public-assets contains only public branding; enforce 10 MiB and allowed MIME types','Mail domain verification and provider delivery evidence','Shared cache invalidation, backup restore and worker alerts','App/database regions and measured production p95']}));
if(failures.length)process.exitCode=1;

}
finish().catch(()=>{console.error('Deployment configuration check failed');process.exitCode=1;});
