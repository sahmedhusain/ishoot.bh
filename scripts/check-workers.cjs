// Suitable for an authenticated operator/monitor; excludes recipients, contents and secrets.
require('dotenv').config({ quiet: true }); require('ts-node').register({ transpileOnly: true, skipProject: true, compilerOptions: { module: 'CommonJS', target: 'ES2022', moduleResolution: 'Node' } });
const { db } = require('../packages/database/src/db.ts');
async function main() {
  const threshold = Math.max(60, Number(process.env.WORKER_ALERT_AFTER_SECONDS) || 300); let unhealthy = false;
  for (const model of ['emailJob', 'revalidationJob']) { const [groups, oldest] = await Promise.all([db[model].groupBy({ by: ['status'], _count: true }), db[model].findFirst({ where: { status: { in: ['pending', 'processing'] }, nextAttemptAt: { lte: new Date(Date.now() - threshold * 1000) } }, orderBy: { nextAttemptAt: 'asc' }, select: { nextAttemptAt: true } })]); const counts = Object.fromEntries(groups.map(r => [r.status, r._count])); if (counts.failed || oldest) unhealthy = true; console.log(JSON.stringify({ queue: model, counts, overdue: !!oldest, alertAfterSeconds: threshold })); }
  if (unhealthy) process.exitCode = 1;
}
main().catch(e => { console.error('Worker monitor could not query the database'); process.exitCode = 1 }).finally(() => db.$disconnect());
