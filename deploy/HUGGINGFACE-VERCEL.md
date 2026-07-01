# 不用 Render：Vercel + Hugging Face（一般不用绑银行卡）

Render 即使选 Free 也可能要求绑卡（账号/地区策略）。下面这套 **通常只需 GitHub 登录**。

| 部分 | 平台 | 网址 |
|------|------|------|
| 网页 Next.js | **Vercel** | https://vercel.com |
| Python 评分 API | **Hugging Face Spaces** | https://huggingface.co/spaces |

---

## 一、Hugging Face 部署 Python（约 15 分钟）

### 1. 注册

1. 打开 **https://huggingface.co/join**
2. 用 **GitHub 账号** 注册（Sign up with GitHub）

### 2. 创建 Space

1. 打开 **https://huggingface.co/new-space**
2. 填写：

| 字段 | 填什么 |
|------|--------|
| Space name | `ai-speaking-trainer-api`（或任意英文名） |
| License | MIT |
| Select the Space SDK | **Docker** |
| Space hardware | **CPU basic · Free** |
| Visibility | **Public**（免费档必须 Public） |

3. **Create Space**

### 3. 连接 GitHub 仓库（推荐）

**方式 A — 在 Space 里连 GitHub：**

1. 进入刚创建的 Space → **Settings**
2. **Repository** → Link to GitHub → 选 `AI-speaking-assist`
3. Space 会使用仓库根目录的 `Dockerfile` 自动构建

**方式 B — 不用连仓库，手动上传：**

在 Space 的 **Files** 里上传仓库中的 `Dockerfile` 和整个 `python/` 文件夹。

### 4. 配置环境变量

Space 页面 → **Settings** → **Variables and secrets** → **New secret**：

| Name | Value |
|------|--------|
| `GLM_API_KEY` | 本地 `python/.env` |
| `ASSEMBLYAI_API_KEY` | 本地 `python/.env` |
| `PYTHON_SPEECH_API_KEY` | 自设密码，如 `my-hf-secret-2026` |
| `GLM_BASE_URL` | `https://open.bigmodel.cn/api/paas/v4` |
| `MODEL_NAME` | `glm-4.7-flashx` |
| `ASSEMBLYAI_BASE_URL` | `https://api.assemblyai.com` |
| `ASSEMBLYAI_SPEECH_MODELS` | `universal-2` |
| `DEV_ECHO_REFERENCE` | `false` |
| `CORS_ORIGINS` | 先填 `https://placeholder.vercel.app`，Vercel 部署完再改 |

### 5. 等待构建

**App** 标签页 → 等状态 **Running**（首次约 5–10 分钟）。

### 6. 记下 API 地址

形如：

```
https://你的用户名-ai-speaking-trainer-api.hf.space
```

验证：浏览器打开

```
https://你的用户名-ai-speaking-trainer-api.hf.space/health
```

应返回 `{"status":"ok",...}`

---

## 二、Vercel 部署网页（约 10 分钟）

1. **https://vercel.com** → GitHub 登录
2. **Add New → Project** → 选 **AI-speaking-assist**
3. Environment Variables：

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | 本地 `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 本地 `.env.local` |
| `NEXT_PUBLIC_SUPABASE_AUDIO_BUCKET` | `audio-responses` |
| `SUPABASE_SERVICE_ROLE_KEY` | 本地 `.env.local` |
| `PYTHON_SPEECH_API_URL` | 上一步 HF Space 地址（无末尾 `/`） |
| `PYTHON_SPEECH_API_KEY` | 和 HF 里 **相同** |
| `NEXT_PUBLIC_APP_URL` | 部署完 Vercel 地址再改 |

4. **Deploy**

---

## 三、把两边连起来

1. HF Space → **Settings → Variables** → `CORS_ORIGINS` 改成  
   `https://你的项目.vercel.app`
2. Space 会自动重启
3. Vercel → **Redeploy** 一次

---

## 四、测试

Vercel 网址 → Test Library → 录一题 → 等评分。

HF 免费 Space 也会休眠，第一次可能较慢。

---

## 其他不用 Render 的选择

| 平台 | 绑卡 | 说明 |
|------|------|------|
| **Vercel + Hugging Face** | 通常不要 | **推荐** |
| **Railway** | 常不要 | https://railway.app ，有免费额度，选 Python 部署 `python/` |
| **Fly.io** | 要 | 不推荐若不想绑卡 |
| **国内学生机** | 支付宝 | 见 `deploy/DEPLOY-BAOTA.md` |

---

## Railway 简版（备选）

1. **https://railway.app** → GitHub 登录
2. **New Project → Deploy from GitHub** → `AI-speaking-assist`
3. 设置 **Root Directory** = `python`
4. Start command：`uvicorn main:app --host 0.0.0.0 --port $PORT`
5. 填与 HF 相同的环境变量
6. 复制 Railway 给的 URL 填到 Vercel 的 `PYTHON_SPEECH_API_URL`
