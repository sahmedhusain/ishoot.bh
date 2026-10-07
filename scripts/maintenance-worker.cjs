// Expired pending uploads only; never removes claimed files or accepted email evidence.
// Also moves issued invoices past their due date to overdue, reminds/escalates stale approvals, syncs social accounts every six hours
// reminds HR and settings managers about expiring employee documents, company documents and tax certificates,
// and records or reminds periodic company bills (rent, utilities, phones, subscriptions).
require('dotenv').config({quiet:true});
require('ts-node').register({transpileOnly:true,skipProject:true,compilerOptions:{module:'CommonJS',target:'ES2022',moduleResolution:'Node',esModuleInterop:true}});
const {db}=require('../packages/database/src/db.ts');
const {removeExpiredUploads}=require('../packages/database/src/services/maintenance.ts');
const {markOverdueInvoices}=require('../packages/database/src/queries/invoices.ts');
const {processApprovalTimeouts}=require('../packages/database/src/services/approval-engine.ts');
const {syncDueSocialIntegrations}=require('../packages/database/src/queries/integrations.ts');
const {sendExpiryReminders}=require('../packages/database/src/services/expiry-reminders.ts');
const {processRecurringExpenses}=require('../packages/database/src/queries/recurring-expenses.ts');
let stopped=false;process.on('SIGINT',()=>stopped=true);process.on('SIGTERM',()=>stopped=true);
async function pass(){
 const removed=await removeExpiredUploads();
 const approvals=await processApprovalTimeouts();
 const social=await syncDueSocialIntegrations();
 const expiryReminders=await sendExpiryReminders();
 const recurringExpenses=await processRecurringExpenses();
 const [abuse,sessions,overdue]=await Promise.all([db.abuseWindow.deleteMany({where:{expiresAt:{lt:new Date(Date.now()-86400000)}}}),db.session.deleteMany({where:{expiresAt:{lt:new Date()}}}),markOverdueInvoices()]);
 console.log(JSON.stringify({event:'maintenance',expiredUploadsRemoved:removed,expiredAbuseWindowsRemoved:abuse.count,expiredSessionsRemoved:sessions.count,invoicesMarkedOverdue:overdue,approvalsReminded:approvals.reminded,approvalsEscalated:approvals.escalated,socialSynced:social.synced,socialSyncFailed:social.failed,expiryReminders,recurringExpensesRecorded:recurringExpenses.recorded,recurringExpenseReminders:recurringExpenses.reminded}));
}
async function main(){do{await pass();if(process.argv.includes('--once'))break;if(!stopped)await new Promise(r=>setTimeout(r,60000));}while(!stopped);}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
