const { execSync } = require("child_process");

const ports = [3000, 3001, 3002, 3003, 8080];

for (const port of ports) {
  try {
    if (process.platform === "win32") {
      execSync(
        `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /f /pid %a 2>nul`,
        { stdio: "ignore" }
      );
    } else {
      execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, {
        stdio: "ignore",
        shell: "/bin/sh",
      });
    }
  } catch {
    // Port is free or already cleared
  }
}
