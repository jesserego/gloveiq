import { spawn } from "node:child_process";
const cmd = process.platform === "win32" ? "npm.cmd" : "npm";
const api = spawn(cmd, ["--workspace", "apps/api", "run", "dev"], { stdio: "inherit" });
const web = spawn(cmd, ["--workspace", "apps/web", "run", "dev"], { stdio: "inherit" });
function shutdown(code=0){
  try { api.kill("SIGINT"); } catch {}
  try { web.kill("SIGINT"); } catch {}
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
api.on("exit", (c) => shutdown(c ?? 0));
web.on("exit", (c) => shutdown(c ?? 0));
