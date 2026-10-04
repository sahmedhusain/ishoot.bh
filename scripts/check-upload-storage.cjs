require('ts-node').register({transpileOnly:true,skipProject:true,compilerOptions:{module:'CommonJS',target:'ES2022',moduleResolution:'Node',esModuleInterop:true}});
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,mocks){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:id=>{id=((i,m)=>i in m?i:(i.startsWith('@ishoot/database/')&&'@ishoot/database' in m?'@ishoot/database':i))(id,mocks);if(!(id in mocks))throw Error('Missing mock '+id);return mocks[id];},process,Buffer,Date,console});return module.exports;}
async function main(){
  let metadata={size:123,contentType:'application/pdf'},downloads=0,creates=0,claims=0,access=0;
  const storage=load('packages/database/src/services/storage.ts',{'@supabase/supabase-js':{createClient:()=>({storage:{from:bucket=>({info:async path=>({data:metadata,error:null}),download:async()=>{downloads++;}})}})}});
  process.env.SUPABASE_URL='https://storage-test.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
  const upload={fileUrl:'/api/files/invoices/test.pdf',isPublic:false,fileSize:123,mimeType:'application/pdf',ownerId:'u',fileName:'test.pdf',expiresAt:new Date(Date.now()+60000),claimedAt:null};
  assert.equal(storage.uploadStorageLocation(upload.fileUrl,false).bucket,'private-assets');
  assert.equal(storage.uploadStorageLocation('/api/files/brand/test.png',true).path,'brand/test.png');
  assert.throws(()=>storage.uploadStorageLocation('/api/files/general/../../secret.pdf',false),/Invalid/);
  await storage.verifyStoredUpload(upload);assert.equal(downloads,0,'metadata must not download entire objects');
  metadata={size:124,contentType:'application/pdf'};await assert.rejects(storage.verifyStoredUpload(upload),/does not match/);
  metadata={size:123,contentType:'image/png'};await assert.rejects(storage.verifyStoredUpload(upload),/does not match/);
  metadata={size:123,contentType:'application/pdf'};
  const response={json:(body,options)=>({body,status:options?.status||200})};
  let user={id:'u'},denied=false,claimCount=1;
  const tx={uploadObject:{updateMany:async()=>{claims++;return {count:claimCount}}},attachment:{create:async()=>{creates++;return {id:'a'}}},activityLog:{create:async()=>{}}};
  const finalize=load('apps/admin/app/api/upload/finalize/route.ts',{'next/server':{NextResponse:response},'next/cache':{revalidatePath(){}},'../../../../lib/auth':{getCurrentUser:async()=>user},'../../../../lib/attachment-access':{requireAttachmentAccess:async()=>{access++;if(denied)throw Error('denied')}},'@ishoot/database':{measureOperation:async(_,fn)=>fn(),verifyStoredUpload:storage.verifyStoredUpload,db:{uploadObject:{findUnique:async()=>upload},$transaction:async fn=>fn(tx)}}});
  const request=data=>({json:async()=>data});
  user=null;assert.equal((await finalize.POST(request({}))).status,401);user={id:'u'};
  denied=true;assert.equal((await finalize.POST(request({fileUrl:upload.fileUrl,entityType:'invoice',entityId:'i'}))).status,403);assert.equal(claims,0);denied=false;
  metadata={size:999,contentType:'application/pdf'};assert.equal((await finalize.POST(request({fileUrl:upload.fileUrl,entityType:'invoice',entityId:'i'}))).status,500);assert.equal(creates,0);
  metadata={size:123,contentType:'application/pdf'};
  assert.equal((await finalize.POST(request({fileUrl:upload.fileUrl,entityType:'invoice',entityId:'pending'}))).status,200);assert.equal(creates,0);
  assert.equal((await finalize.POST(request({fileUrl:upload.fileUrl,entityType:'invoice',entityId:'i'}))).status,200);assert.equal(creates,1);
  claimCount=0;assert.equal((await finalize.POST(request({fileUrl:upload.fileUrl,entityType:'invoice',entityId:'i'}))).status,500);assert.equal(creates,1,'concurrent second claim must not create an attachment');
  const {encryptIntegrationCredentials,decryptIntegrationCredentials}=require('../apps/admin/lib/integration-credentials.ts');
  delete process.env.ENCRYPTION_KEY;assert.throws(()=>encryptIntegrationCredentials({token:'test'}),/Configure/);
  process.env.ENCRYPTION_KEY='a'.repeat(32);
  const sealed=encryptIntegrationCredentials({token:'test'});assert.equal(decryptIntegrationCredentials(sealed).token,'test');assert.equal(decryptIntegrationCredentials(sealed+'ff'),null);
  const cwd=process.cwd();
  try {
    const adminRequire=require('node:module').createRequire(require.resolve('../apps/admin/package.json'));
    const {resolveConfiguredPdfAsset}=load('apps/admin/lib/pdf/configured-asset.ts',{
      sharp:adminRequire('sharp'), 'fs/promises':require('node:fs/promises'), path:require('node:path'), '@ishoot/database':{uploadRoot:()=>'/unused'}
    });
    process.chdir(require('node:path').join(cwd,'apps/admin'));
    const png=await resolveConfiguredPdfAsset('/brand/logo-text-light.svg');
    assert.ok(Buffer.isBuffer(png),'the bundled SVG logo must resolve to image bytes');
    assert.equal(png.subarray(1,4).toString(),'PNG','PDF branding must use a supported raster format');
  } finally { process.chdir(cwd); }
  const {Webhook}=require('svix');
  const {verifyResendWebhook}=require('../apps/admin/lib/resend-webhook.ts');
  const secret='whsec_'+Buffer.from('disposable-test-secret').toString('base64'),id='evt-test',timestamp=new Date(),payload=JSON.stringify({type:'email.delivered',data:{email_id:'email-test'}});
  process.env.RESEND_WEBHOOK_SECRET=secret;
  const signature=new Webhook(secret).sign(id,timestamp,payload);
  const headers=new Headers({'svix-id':id,'svix-timestamp':String(Math.floor(timestamp.getTime()/1000)),'svix-signature':signature});
  assert.equal(verifyResendWebhook(payload,headers).id,id);
  assert.throws(()=>verifyResendWebhook(payload+' ',headers),/INVALID_SIGNATURE/);
  assert.throws(()=>verifyResendWebhook(payload,new Headers()),/INVALID_SIGNATURE/);
  const old=new Date(Date.now()-600000);headers.set('svix-timestamp',String(Math.floor(old.getTime()/1000)));headers.set('svix-signature',new Webhook(secret).sign(id,old,payload));assert.throws(()=>verifyResendWebhook(payload,headers),/INVALID_SIGNATURE/);
  delete process.env.RESEND_WEBHOOK_SECRET;assert.throws(()=>verifyResendWebhook(payload,headers),/WEBHOOK_NOT_CONFIGURED/);
  console.log('Upload/storage checks passed: permissions, metadata, atomic claim, path containment, bounded metadata; webhook tampering, missing signature and replay rejection.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
