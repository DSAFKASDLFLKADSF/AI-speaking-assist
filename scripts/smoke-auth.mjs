/** Quick smoke test: register → me → login against local Next.js */
const base = process.env.BASE_URL ?? "http://localhost:3000";
const email = `smoke-${Date.now()}@example.com`;
const password = "testpass123";

async function main() {
  const jar = new Map();

  async function api(path, init = {}) {
    const headers = new Headers(init.headers);
    if (jar.size) {
      headers.set(
        "cookie",
        [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ")
      );
    }
    const res = await fetch(`${base}${path}`, { ...init, headers });
    const setCookie = res.headers.getSetCookie?.() ?? [];
    for (const raw of setCookie) {
      const [pair] = raw.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) {
        jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
    }
    const text = await res.text();
    let body = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* plain text */
    }
    return { status: res.status, body };
  }

  const reg = await api("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  console.log("register", reg.status, reg.body);

  const me = await api("/api/auth/me");
  console.log("me after register", me.status, me.body);

  await api("/api/auth/logout", { method: "POST" });

  const login = await api("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  console.log("login", login.status, login.body);

  const me2 = await api("/api/auth/me");
  console.log("me after login", me2.status, me2.body);

  if (
    reg.status !== 201 ||
    me.status !== 200 ||
    login.status !== 200 ||
    me2.status !== 200
  ) {
    process.exit(1);
  }
  console.log("OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
