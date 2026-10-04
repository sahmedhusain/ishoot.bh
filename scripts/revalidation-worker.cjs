require("dotenv").config({ quiet: true });
require("ts-node").register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: "CommonJS",
    target: "ES2022",
    moduleResolution: "Node",
  },
});
const { db } = require("../packages/database/src/db.ts");
const {
  processRevalidationJobs,
} = require("../packages/database/src/services/revalidation-outbox.ts");
let stopped = false;
process.on("SIGINT", () => {
  stopped = true;
});
process.on("SIGTERM", () => {
  stopped = true;
});
async function main() {
  if (!process.env.WEB_URL || !process.env.REVALIDATION_SECRET)
    throw new Error("Set WEB_URL and REVALIDATION_SECRET for this worker");
  do {
    await processRevalidationJobs({
      webUrl: process.env.WEB_URL,
      secret: process.env.REVALIDATION_SECRET,
    });
    if (process.argv.includes("--once")) break;
    if (!stopped) await new Promise((resolve) => setTimeout(resolve, 10000));
  } while (!stopped);
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
