/**
 * PM2 — run from repo root:
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 */
module.exports = {
  apps: [
    {
      name: "ai-speaking-web",
      cwd: __dirname + "/..",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "512M",
    },
    {
      name: "ai-speaking-python",
      cwd: __dirname + "/../python",
      script: "venv/bin/uvicorn",
      args: "main:app --host 127.0.0.1 --port 8000",
      interpreter: "none",
      max_memory_restart: "768M",
    },
  ],
};
