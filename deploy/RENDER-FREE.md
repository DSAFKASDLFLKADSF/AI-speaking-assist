# Render 免费部署（不用 Blueprint 也行）

仓库：`https://github.com/DSAFKASDLFLKADSF/AI-speaking-assist`

**为什么 Blueprint 逼你绑卡？**  
之前 `render.yaml` 里写的是 `plan: starter`（付费档）。已改成 `plan: free`。若仍要绑卡，用下面 **手动创建**，在界面里选 **Free**。

---

## 一、Render 部署 Python（免费）

### 网址

1. 打开 **https://render.com**
2. 用 **GitHub** 注册 / 登录（Sign Up With GitHub）

### 不要点 Blueprint — 改用手动创建

1. 登录后右上角 **New +**
2. 选 **Web Service**（不是 Blueprint）
3. **Connect a repository** → 选 `AI-speaking-assist` → **Connect**

### 填写表单（逐项对照）

| 页面字段 | 填什么 |
|----------|--------|
| **Name** | `ai-speaking-trainer-python` |
| **Region** | **Singapore**（离国内/智谱较近） |
| **Branch** | `master` |
| **Root Directory** | `python` |
| **Runtime** | **Python 3** |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | 选 **Free**（$0 / month）← 关键 |

4. 往下滚到 **Environment Variables**，点 **Add Environment Variable**，逐个添加：

| Key | Value |
|-----|--------|
| `GLM_API_KEY` | 本地 `python/.env` 里的智谱 key |
| `ASSEMBLYAI_API_KEY` | 本地 `python/.env` 里的 key |
| `GLM_BASE_URL` | `https://open.bigmodel.cn/api/paas/v4` |
| `MODEL_NAME` | `glm-4.7-flashx` |
| `ASSEMBLYAI_BASE_URL` | `https://api.assemblyai.com` |
| `ASSEMBLYAI_SPEECH_MODELS` | `universal-2` |
| `PYTHON_SPEECH_API_KEY` | 自己设密码，如 `my-secret-2026` |
| `CORS_ORIGINS` | 先填 `https://placeholder.vercel.app`，Vercel 部署完再改 |
| `DEV_ECHO_REFERENCE` | `false` |
| `LOG_LEVEL` | `INFO` |

5. 点 **Create Web Service**
6. 等 3–5 分钟，状态变 **Live**
7. 顶部复制地址，形如：  
   `https://ai-speaking-trainer-python.onrender.com`

### 验证

浏览器打开：

`https://你的服务名.onrender.com/health`

应看到 JSON：`{"status":"ok",...}`

---

## 二、Vercel 部署网页（免费，一般不用绑卡）

### 网址

1. 打开 **https://vercel.com**
2. **Sign Up** → **Continue with GitHub**

### 导入项目

1. **Add New… → Project**
2. 列表里选 **AI-speaking-assist** → **Import**
3. Framework：**Next.js**（自动识别）
4. **Environment Variables** 添加：

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | 本地 `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 本地 `.env.local` |
| `NEXT_PUBLIC_SUPABASE_AUDIO_BUCKET` | `audio-responses` |
| `SUPABASE_SERVICE_ROLE_KEY` | 本地 `.env.local`（有就填） |
| `PYTHON_SPEECH_API_URL` | 上一步 Render 地址（无末尾斜杠） |
| `PYTHON_SPEECH_API_KEY` | 和 Render 里 **完全相同** |
| `NEXT_PUBLIC_APP_URL` | 先随便填，部署完再改 |

5. **Deploy**
6. 完成后得到地址，如：`https://ai-speaking-assist.vercel.app`

---

## 三、把两边连起来

### 1. 改 Render 的 CORS

1. **https://dashboard.render.com** → 点 Python 服务
2. **Environment** → 编辑 `CORS_ORIGINS`  
   改成：`https://ai-speaking-assist.vercel.app`（你的 Vercel 域名）
3. **Save Changes**（会自动 redeploy）

### 2. 改 Vercel 的站点 URL

1. **https://vercel.com** → 项目 → **Settings → Environment Variables**
2. 把 `NEXT_PUBLIC_APP_URL` 改成你的 Vercel 域名
3. **Deployments** → 最新一次 → **⋯ → Redeploy**

---

## 四、测试

打开 Vercel 网址 → Test Library → 录一题 → 等评分。

**免费 Render 会休眠**：15 分钟没人用，第一次评分可能要等 **30–60 秒**（冷启动），属正常。

---

## 仍要绑卡怎么办？

| 情况 | 做法 |
|------|------|
| 误选了 Starter / Standard | 删掉服务，按上文 **手动创建 + Instance Type = Free** |
| Blueprint 仍要卡 | **别用 Blueprint**，用手动 Web Service |
| Render 账号强制要验证 | 换 **Railway**（https://railway.app，有免费额度）或 **Hugging Face Spaces** |

绑卡但选 **Free** 实例：多数情况下 **$0 扣费**；只有超流量或升到付费档才会收钱。

---

## 仍想用 Blueprint（可选）

`render.yaml` 已是 `plan: free` 后：

1. **New + → Blueprint**
2. 选仓库 `AI-speaking-assist`
3. 填 secret：`GLM_API_KEY`、`ASSEMBLYAI_API_KEY`、`PYTHON_SPEECH_API_KEY`

若仍跳绑卡，改用手动方式即可。
