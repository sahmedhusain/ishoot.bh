const path = require("node:path");
module.exports = {
  root: true,
  extends: ["next/core-web-vitals"],
  settings: {
    next: {
      rootDir: [
        path.join(__dirname, "apps/admin"),
        path.join(__dirname, "apps/web"),
      ],
    },
  },
  ignorePatterns: [
    "**/.next*/**",
    "**/node_modules/**",
    "packages/database/prisma/generated/**",
    "graphify-out/**",
  ],
};
