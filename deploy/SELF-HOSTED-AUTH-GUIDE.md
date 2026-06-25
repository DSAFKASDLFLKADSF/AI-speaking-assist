# 自建登录系统迁移指南

> **什么时候装服务器、什么时候改环境变量？** 见文末 [部署顺序](#部署顺序什么时候做什么)。

> 目标：用**腾讯云服务器上的 PostgreSQL + 自己的登录 API** 替换 Supabase Auth。  
> 建议分 3 个阶段做，不要一次全改。

---

## 先看结论

| 阶段 | 做什么 | 工作量 | 能否去掉 Supabase |
|------|--------|--------|-------------------|
| **1. 登录** | 注册 / 登录 / 登出 / Session | 2–3 天 | ❌ 数据库和录音仍可用 Supabase |
| **2. 业务数据** | 练习记录、分数写入本地 PostgreSQL | 3–5 天 | ✅ 可去掉 Supabase DB |
| **3. 录音存储** | 录音改存服务器磁盘或 COS | 1–2 天 | ✅ 可完全去掉 Supabase |

**重要：** 只换登录、不换数据库时，Supabase 的 RLS 依赖 `auth.uid()`，**两套用户 ID 会对不上**。  
所以实际推荐：**阶段 1 和 2 一起做**（登录 + 业务数据一起迁到本地 PostgreSQL），阶段 3 录音可以最后再迁。

---

## 当前项目里 Supabase 用在哪

### A. 登录（阶段 1 要替换）

| 文件 | 用途 |
|------|------|
| `lib/supabase.ts` | 浏览器 Supabase 客户端 |
| `lib/supabase-server.ts` | 服务端读 cookie 里的 Supabase session |
| `components/AuthModal.tsx` | `signUp` / `signInWithPassword` |
| `components/Navbar.tsx` | `getSession` / `onAuthStateChange` / `signOut` |
| `components/dashboard/HeaderActions.tsx` | 同上 |
| `app/api/health/supabase/route.ts` | 诊断接口（可删或改成 `/api/health/auth`） |

### B. 业务数据（阶段 2 要替换）

| 文件 | 用途 |
|------|------|
| `lib/createPracticeSession.ts` | 插入 `practice_sessions` |
| `lib/getPracticeHistory.ts` | 查询历史 + join audio/scores |
| `lib/saveListenRepeatAnalysis.ts` | 保存 LR 分析结果 |
| `lib/saveInterviewAnalysis.ts` | 保存 Interview 分析结果 |
| `lib/finalizeListenRepeatAnalysis.ts` | 分析完成后写库 |
| `lib/finalizeInterviewAnalysis.ts` | 同上 |
| `app/api/session/route.ts` | 创建 session（需登录） |
| `app/api/history/route.ts` | 读历史（需登录） |
| `app/api/analyze-speech/jobs/[jobId]/route.ts` | 轮询后可选写库 |
| `app/api/analyze-interview/jobs/[jobId]/route.ts` | 同上 |
| `app/(library)/growth/page.tsx` | 登录后拉云端历史 |

### C. 录音存储（阶段 3 要替换）

| 文件 | 用途 |
|------|------|
| `lib/uploadAudio.ts` | 上传到 Supabase Storage |
| `lib/examPipelineAnalysis.ts` | `refreshSignedAudioUrl` |
| `components/exam/TestExamRunner.tsx` | 考试录音上传 |

### D. 暂时不用动（已有本地兜底）

| 文件 | 说明 |
|------|------|
| `lib/localHistory.ts` | 未登录时历史存 `localStorage` |
| `app/api/analyze-speech/route.ts` | 打分走 Python，不依赖 Supabase |
| `app/api/analyze-interview/route.ts` | 同上 |
| `python/*` | 语音分析服务，独立运行 |

---

## 推荐技术选型

```
登录：邮箱 + 密码
密码：bcrypt（cost 12）
Session：httpOnly Cookie + 签名 JWT（jose）
数据库：PostgreSQL 16（装在同一台腾讯云服务器）
ORM：先用 pg（node-postgres）或 Drizzle — 不必上 Prisma 也行
```

**不推荐现阶段用：** NextAuth OAuth、邮箱验证、Redis Session（用户少时没必要）。

---

## 服务器准备（腾讯云 Ubuntu）

SSH 登录后执行：

```bash
# 1. 安装 PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# 2. 建库和用户
sudo -u postgres psql <<'SQL'
CREATE USER speaking_app WITH PASSWORD '换成强密码';
CREATE DATABASE speaking_trainer OWNER speaking_app;
GRANT ALL PRIVILEGES ON DATABASE speaking_trainer TO speaking_app;
SQL

# 3. 录音目录（阶段 3 用，可先建好）
sudo mkdir -p /data/audio
sudo chown -R ubuntu:ubuntu /data/audio
```

只允许本机连库（默认即可）：

```bash
# 确认监听 localhost
sudo ss -tlnp | grep 5432
```

---

## 阶段 1 + 2：数据库设计

在服务器或本地用 `psql` 执行。  
基于现有 `supabase/schema.sql`，但**用户表不再依赖 `auth.users`**。

```sql
-- deploy/sql/001_auth_and_core.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 用户（自建登录）
CREATE TABLE app_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  native_language TEXT NOT NULL DEFAULT 'zh-CN',
  target_score  SMALLINT NOT NULL DEFAULT 24 CHECK (target_score BETWEEN 0 AND 30),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 可选：服务端 session 表（用 JWT 则可省略）
CREATE TABLE app_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_sessions_user ON app_sessions(user_id);
CREATE INDEX idx_app_sessions_expires ON app_sessions(expires_at);

-- 以下表从 supabase/schema.sql 搬过来，把 REFERENCES users 改成 app_users
-- 枚举类型、practice_sessions、audio_responses、scores、behavior_metrics 等
-- 注意：删除所有 auth.uid() 的 RLS policy — 改由 Next.js API 用 userId 过滤
```

完整表结构：复制 `supabase/schema.sql` 里 `practice_sessions` 及之后的表，做两处修改：

1. `users` 表 → 用上面的 `app_users`（加 `password_hash`）
2. 所有 `REFERENCES users (id)` → `REFERENCES app_users (id)`
3. **删除** 文件末尾 `handle_new_user` 触发器（注册时由 API 插入 `app_users`）

---

## 环境变量（替换 Supabase）

`.env.local` / 服务器 `.env.local`：

```env
# App
NEXT_PUBLIC_APP_URL=http://101.32.216.132

# 自建数据库（仅服务端，不要 NEXT_PUBLIC_）
DATABASE_URL=postgresql://speaking_app:你的密码@127.0.0.1:5432/speaking_trainer

# Session 签名密钥（随机 32+ 字符）
AUTH_SECRET=用 openssl rand -base64 32 生成

# Cookie
AUTH_COOKIE_NAME=speaking_session
AUTH_SESSION_DAYS=30

# 阶段 3：本地录音
AUDIO_STORAGE_DIR=/data/audio
# 对外访问前缀（Nginx 静态或 API 代理）
NEXT_PUBLIC_AUDIO_BASE_URL=http://101.32.216.132/audio
```

**删除或注释（阶段 2 完成后）：**

```env
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
# NEXT_PUBLIC_SUPABASE_AUDIO_BUCKET=
# SUPABASE_SERVICE_ROLE_KEY=
```

---

## 需要新增的文件

```
lib/
  db.ts                    # PostgreSQL 连接池（pg Pool）
  auth/
    password.ts            # bcrypt hash / verify
    session.ts             # 创建/读取/清除 cookie session
    getCurrentUser.ts      # 服务端：从 cookie 取当前用户
  repositories/
    users.ts               # findByEmail, createUser
    practiceSessions.ts    # 替代 supabase.from('practice_sessions')
    practiceHistory.ts     # 替代 getPracticeHistory 里的 supabase 查询
    analysis.ts            # 替代 saveListenRepeat/Interview

app/api/auth/
  register/route.ts        # POST 注册
  login/route.ts           # POST 登录
  logout/route.ts          # POST 登出
  me/route.ts              # GET 当前用户

middleware.ts              # 可选：保护 /api/session、/api/history

deploy/sql/
  001_auth_and_core.sql    # 建表脚本
```

---

## 需要安装的 npm 包

```bash
npm install pg bcryptjs jose
npm install -D @types/pg @types/bcryptjs
```

阶段 2 完成后卸载：

```bash
npm uninstall @supabase/supabase-js @supabase/ssr
```

---

## 阶段 1：登录 API 规格

### `POST /api/auth/register`

```json
// Request
{ "email": "you@example.com", "password": "至少6位", "displayName": "可选" }

// Response 201
{ "user": { "id": "uuid", "email": "...", "displayName": "..." } }
// 同时 Set-Cookie: speaking_session=...
```

逻辑：

1. 校验邮箱格式、密码长度
2. 查 `app_users` 是否已存在 → 409
3. `bcrypt.hash(password, 12)`
4. `INSERT INTO app_users`
5. 签发 JWT，写入 httpOnly cookie

### `POST /api/auth/login`

同注册，验证 `bcrypt.compare`，失败返回 401。

### `POST /api/auth/logout`

清除 cookie；若用 `app_sessions` 表则删除对应行。

### `GET /api/auth/me`

有有效 cookie → `{ user: {...} }`；无 → 401。

### Cookie 设置要点

```ts
// session.ts 示例选项
{
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // 有 HTTPS 后改 true
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
}
```

---

## 阶段 1：前端要改什么

### `components/AuthModal.tsx`

| 现在 | 改成 |
|------|------|
| `getSupabase().auth.signInWithPassword` | `fetch('/api/auth/login', { method:'POST', body })` |
| `getSupabase().auth.signUp` | `fetch('/api/auth/register', ...)` |
| `isSupabaseConfigured()` | 删除；登录不依赖外部服务 |
| Supabase 相关错误文案 | 改成普通 HTTP 错误处理 |

### `components/Navbar.tsx` + `HeaderActions.tsx`

| 现在 | 改成 |
|------|------|
| `User` from `@supabase/supabase-js` | 自建 `type AppUser = { id: string; email: string; displayName?: string }` |
| `getSupabase().auth.getSession()` | `fetch('/api/auth/me')` |
| `onAuthStateChange` | 登录/登出成功后 `setUser`；或页面 `router.refresh()` |
| `getSupabase().auth.signOut()` | `fetch('/api/auth/logout', { method:'POST' })` |

### 新建 `lib/auth/client.ts`（可选）

```ts
export async function fetchCurrentUser() {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user as AppUser;
}
```

---

## 阶段 2：API 鉴权要改什么

### 统一鉴权辅助函数 `lib/auth/getCurrentUser.ts`

```ts
// 从 cookie 解析 JWT → 查 app_users → 返回 user 或 null
export async function requireUser(request: Request): Promise<AppUser> {
  const user = await getCurrentUser(request);
  if (!user) throw new AuthError("Unauthorized");
  return user;
}
```

### `app/api/session/route.ts`

```diff
- const supabase = await createSupabaseServerClient();
- const { data: { user } } = await supabase.auth.getUser();
+ const user = await requireUser(request);

- const session = await createPracticeSession(supabase, user.id, body);
+ const session = await createPracticeSession(user.id, body);
```

### `app/api/history/route.ts`

同样把 `supabase.auth.getUser()` 换成 `requireUser(request)`，`getPracticeHistory(supabase, ...)` 改成直接查 PostgreSQL。

### `lib/createPracticeSession.ts` / `getPracticeHistory.ts` / `save*.ts`

- 去掉参数 `supabase: TypedSupabaseClient`
- 改用 `lib/repositories/*` 里的 SQL
- **保持返回类型不变**（`PracticeSessionRecord`、`PracticeHistoryResponse` 等），前端改动最小

### `lib/finalizeListenRepeatAnalysis.ts` / `finalizeInterviewAnalysis.ts`

```diff
- const supabase = getSupabase();
- const { data: { user } } = await supabase.auth.getUser();
+ const user = await fetchCurrentUser(); // 客户端需已登录
- await saveListenRepeatAnalysis(supabase, { userId: user.id, ... });
+ await saveListenRepeatAnalysis({ userId: user.id, ... });
```

客户端保存可改为调 `POST /api/analysis/save`（推荐），避免浏览器直连数据库。

---

## 阶段 3：录音存储要改什么

### 新建 `app/api/audio/upload/route.ts`

1. `requireUser(request)`（或 `allowAnonymous` 时跳过）
2. `formData` 收 `file`（Blob）
3. 写到 `/data/audio/{userId}/{sessionId}/{timestamp}.webm`
4. 返回 `{ audioUrl, storagePath }`

### Nginx 增加静态目录（`deploy/nginx-site.conf.example` 追加）

```nginx
location /audio/ {
    alias /data/audio/;
    add_header Cache-Control "private, max-age=3600";
    # 生产建议走 signed URL API，不要直接公开目录
}
```

### `lib/uploadAudio.ts`

整文件重写：从 Supabase Storage → `fetch('/api/audio/upload')`。

### `lib/examPipelineAnalysis.ts`

`refreshSignedAudioUrl` → 若 URL 未过期可原样返回；或实现 `GET /api/audio/signed?path=...`。

---

## 删除 / 废弃清单（全部完成后）

| 操作 | 文件 |
|------|------|
| 删除 | `lib/supabase.ts` |
| 删除 | `lib/supabase-server.ts` |
| 删除 | `app/api/health/supabase/route.ts` |
| 删除 | `supabase/` 整个目录（或保留作参考） |
| 更新 | `.env.example` — 去掉 Supabase 变量 |
| 更新 | `supabase/SETUP.md` → 指向本指南 |
| 更新 | `deploy/DEPLOY-TENCENT-HK.md` — 加 PostgreSQL 步骤 |
| 卸载包 | `@supabase/supabase-js`, `@supabase/ssr` |

---

## 部署检查清单

```bash
# 1. 执行 SQL
psql "$DATABASE_URL" -f deploy/sql/001_auth_and_core.sql

# 2. 更新 .env.local
nano /www/wwwroot/ai-speaking-trainer/.env.local

# 3. 安装依赖 + 构建
cd /www/wwwroot/ai-speaking-trainer
npm ci
npm run build

# 4. 重启
pm2 restart ai-speaking-web ai-speaking-python

# 5. 验证
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

curl http://127.0.0.1:3000/api/auth/me -b cookies.txt
```

浏览器验证：

1. 注册 → 不再出现 Supabase 错误
2. 登录 → Navbar 显示邮箱
3. 做一次 Listen & Repeat → Growth 页能看到记录（阶段 2 后）
4. 录音能上传、能打分（阶段 3 后）

---

## 磁盘占用（自建后）

| 项目 | 大约 |
|------|------|
| PostgreSQL 程序 | 0.3 GB |
| 用户 + 分数数据（前期） | < 0.5 GB |
| 程序本身（已有） | 5–12 GB |
| 录音（每 1 万条约） | **+10 GB** |

60 GB 系统盘：够内测；录音多了加数据盘或 COS。

---

## 建议实施顺序（按天）

| 天 | 任务 |
|----|------|
| 1 | 服务器装 PostgreSQL；执行 `001_auth_and_core.sql`；写 `lib/db.ts` |
| 2 | 实现 `/api/auth/*`；改 `AuthModal` + `Navbar` |
| 3 | 改 `session` / `history` API + repository 层 |
| 4 | 改 `saveListenRepeat` / `saveInterview` + growth 页 |
| 5 | 改 `uploadAudio` + Nginx；全链路测试 |
| 6 | 删 Supabase 依赖；更新部署文档；备份脚本 |

---

## 安全注意事项

1. `AUTH_SECRET` 必须随机，不要提交到 Git
2. `DATABASE_URL` 仅服务端使用，不要 `NEXT_PUBLIC_`
3. 密码只存 `password_hash`，永不存明文
4. 所有 `/api/*` 写操作必须 `requireUser`
5. SQL 用参数化查询（`$1, $2`），防注入
6. 有 HTTPS 后：`secure: true`，并限制 `/audio/` 访问
7. 定期备份：`pg_dump speaking_trainer > backup.sql`

---

## 和继续用 Supabase 的对比

| | 继续 Supabase | 自建（本指南） |
|--|---------------|----------------|
| 登录 | 已通 | 需开发 2–3 天 |
| 数据在谁那 | Supabase 云 | 你的腾讯云 |
| 月费 | 免费额度后收费 | 主要是磁盘 |
| 维护 | 少 | 备份、安全自己管 |

---

## 部署顺序：什么时候做什么

代码已改好。按这个顺序在**服务器**上操作：

### 第 1 步：装 PostgreSQL（只装一次）

SSH 登录服务器后：

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib

sudo -u postgres psql <<'SQL'
CREATE USER speaking_app WITH PASSWORD '换成强密码';
CREATE DATABASE speaking_trainer OWNER speaking_app;
GRANT ALL PRIVILEGES ON DATABASE speaking_trainer TO speaking_app;
SQL
```

### 第 2 步：执行建表 SQL（只跑一次）

先把最新代码拉到服务器，然后：

```bash
cd /www/wwwroot/ai-speaking-trainer
psql "postgresql://speaking_app:你的密码@127.0.0.1:5432/speaking_trainer" \
  -f deploy/sql/001_auth_and_core.sql
```

### 第 3 步：改 `.env.local`（这时才改环境变量）

```bash
nano /www/wwwroot/ai-speaking-trainer/.env.local
```

**新增**（登录 + 数据库）：

```env
DATABASE_URL=postgresql://speaking_app:你的密码@127.0.0.1:5432/speaking_trainer
AUTH_SECRET=用下面命令生成
NEXT_PUBLIC_APP_URL=http://101.32.216.132
```

生成 `AUTH_SECRET`：

```bash
openssl rand -base64 32
```

**Supabase 变量**：登录已不再需要；录音上传暂时还可保留 `NEXT_PUBLIC_SUPABASE_*`（阶段 3 再去掉）。

### 第 4 步：拉代码 + build + 重启（改 env 后必须做）

```bash
cd /www/wwwroot/ai-speaking-trainer
git pull
npm ci
npm run build
pm2 restart ai-speaking-web
```

### 第 5 步：验证

```bash
curl http://127.0.0.1:3000/api/health/auth
```

浏览器打开网站 → 注册 → 登录。

| 时机 | 做什么 |
|------|--------|
| **现在（本地）** | 代码已更新；本地要测登录需自己装 PostgreSQL 并填 `DATABASE_URL` + `AUTH_SECRET` |
| **部署到服务器时** | 先装 PostgreSQL → 跑 SQL → 改 `.env.local` → `npm run build` → 重启 PM2 |
| **改 env 之后** | 每次改 `DATABASE_URL` / `AUTH_SECRET` 都要 `npm run build` + 重启（`AUTH_SECRET` 不是 `NEXT_PUBLIC_`，但重启保险） |

---

## 已实现（代码侧）

- `app/api/auth/register|login|logout|me`
- `lib/db.ts`、`lib/auth/*`、`lib/repositories/users.ts`
- 练习记录读写改走 PostgreSQL（`createPracticeSession`、`getPracticeHistory`、`save*Analysis`）
- `AuthModal`、`Navbar`、`HeaderActions`、`growth` 页改用自建登录
- 录音上传仍走 Supabase Storage（可选，阶段 3 改本地磁盘）
