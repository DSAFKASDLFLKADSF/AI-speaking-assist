# Supabase 本地配置指南

## 1. 创建项目（还没有的话）

1. 打开 [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → 记下数据库密码
3. 等待项目初始化完成

## 2. 获取 API 凭证

Dashboard → **Project Settings** → **API**：

| Dashboard 字段 | 写入 `.env.local` |
|----------------|-------------------|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public** key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

## 3. 初始化数据库

SQL Editor → **New query**，依次执行：

1. `supabase/schema.sql` — 表结构 + RLS
2. `supabase/storage.sql` — 录音 Storage 桶 + 上传策略

## 4. 填写 `.env.local`

项目根目录 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_SUPABASE_AUDIO_BUCKET=audio-responses

PYTHON_SPEECH_API_URL=http://localhost:8000
```

## 5. 重启服务

```powershell
# 终端 1 — Python 打分
cd python
uvicorn main:app --reload --port 8000

# 终端 2 — Next.js
npm run dev
```

## 6. 验证

- 浏览器打开 `http://localhost:3000/listen-repeat`
- 录音后应显示 **Uploading to cloud…** → **Analyzing…** → 分数结果
- 不再出现 `Missing Supabase environment variables`

## 可选

- **Authentication → Providers → Email**：开启邮箱登录
- **Storage → audio-responses**：确认桶已创建
- 服务端写入可额外配置 `SUPABASE_SERVICE_ROLE_KEY`（勿暴露到浏览器）
