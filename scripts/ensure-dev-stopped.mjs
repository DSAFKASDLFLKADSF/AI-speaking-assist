import net from "node:net";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

function portInUse(p) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => resolve(err.code === "EADDRINUSE"));
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(p);
  });
}

const inUse = await portInUse(port);
if (inUse) {
  console.error("");
  console.error(`Port ${port} is in use — npm run dev is probably still running.`);
  console.error("Stop dev before build, or the .next cache will corrupt and the site will break.");
  console.error("");
  console.error("  Fix a broken dev server:  npm run dev:clean");
  console.error("");
  process.exit(1);
}
