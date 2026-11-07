// E2E Test Database Helper (Go Backend Microservices)
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
require("dotenv").config({ path: path.join(root, ".env"), quiet: true });

const [mode, database] = process.argv.slice(2);
if (!["seeded", "blank", "bare"].includes(mode || "") || !/^[a-z0-9_]+_test$/.test(database ?? "")) {
  console.log("Usage: node helpers/prepare-db.cjs <seeded|blank|bare> <name_ending_in_test>");
  if (process.argv.length > 2) process.exit(1);
}

async function main() {
  console.log(`Database helper: PostgreSQL managed by Go services Docker container.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
