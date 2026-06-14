# 腾讯云轻量 · 香港 · Ubuntu 部署指南

适用：**轻量应用服务器** + **操作系统镜像 Ubuntu 22.04/24.04** + **地域香港**。

香港节点优势：访问 AssemblyAI / 智谱等外网 API 较稳定；**无需大陆 ICP 备案**（域名解析到香港 IP 即可）。

---

## 架构

```
浏览器 ──HTTPS:443──► Nginx ──► Next.js (127.0.0.1:3000)
                                    │
                                    └──► Python API (127.0.0.1:8000)
Supabase · AssemblyAI · 智谱 GLM（云端，不在本机安装）
```

**安全组 / 防火墙只放行：22、80、443**。不要对公网开放 3000、8000。

---

## 一、腾讯云控制台

1. 轻量实例 → **防火墙** → 添加规则：

| 协议 | 端口 | 来源 | 说明 |
|------|------|------|------|
| TCP | 22 | 你的 IP（或 0.0.0.0/0 临时） | SSH |
| TCP | 80 | 0.0.0.0/0 | HTTP（证书验证 + 跳转 HTTPS） |
| TCP | 443 | 0.0.0.0/0 | HTTPS（录音必须） |

2. 记下 **公网 IP**。

3. 域名（可选但推荐）：在 DNS 添加 **A 记录** → 指向该 IP，例如 `speaking.example.com`。

---

## 二、SSH 登录 + 系统依赖

```bash
ssh ubuntu@你的公网IP
# 若镜像默认是 root：ssh root@你的公网IP
```

一键装依赖（也可 `bash deploy/bootstrap-ubuntu.sh` 只装系统包）：

```bash
sudo apt update
sudo apt install -y git curl nginx certbot python3-certbot-nginx \
  python3.11 python3.11-venv python3-pip ffmpeg libsndfile1

# Node.js 22（NodeSource）
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

node -v   # v22.x
npm -v
```

安装 PM2：

```bash
sudo npm install -g pm2
```

---

## 三、拉代码

```bash
sudo mkdir -p /www/wwwroot
cd /www/wwwroot
sudo git clone https://github.com/DSAFKASDLFLKADSF/AI-speaking-assist.git ai-speaking-trainer
sudo chown -R $USER:$USER ai-speaking-trainer
cd ai-speaking-trainer
```

若仓库为私有，改用 Deploy Key 或 Personal Access Token。

---

## 四、环境变量

参考 [`deploy/env.server.example`](./env.server.example)。

### 4.1 Next.js — `/www/wwwroot/ai-speaking-trainer/.env.local`

```bash
nano .env.local
```

```env
NEXT_PUBLIC_APP_NAME=TOEFL Speaking AI
NEXT_PUBLIC_APP_URL=https://你的域名

NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_AUDIO_BUCKET=audio-responses
SUPABASE_SERVICE_ROLE_KEY=eyJ...

PYTHON_SPEECH_API_URL=http://127.0.0.1:8000
PYTHON_SPEECH_API_KEY=请换成一长串随机密码
PYTHON_SPEECH_API_TIMEOUT_MS=300000
```

### 4.2 Python — `/www/wwwroot/ai-speaking-trainer/python/.env`

```bash
nano python/.env
```

```env
GLM_API_KEY=你的智谱key
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
MODEL_NAME=glm-4.7

ASSEMBLYAI_API_KEY=你的AssemblyAIKey
ASSEMBLYAI_BASE_URL=https://api.assemblyai.com
ASSEMBLYAI_SPEECH_MODELS=universal-2

PYTHON_SPEECH_API_KEY=与上面 .env.local 完全相同
CORS_ORIGINS=https://你的域名
DEV_ECHO_REFERENCE=false
LOG_LEVEL=INFO
```

**生产必改：** `DEV_ECHO_REFERENCE=false`，`PYTHON_SPEECH_API_KEY` 两边一致。

---

## 五、构建与 PM2 启动

```bash
cd /www/wwwroot/ai-speaking-trainer

npm ci
npm run build

cd python
python3.11 -m venv venv
./venv/bin/pip install -r requirements.txt
cd ..

pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
# 按 pm2 提示复制并执行那一行 sudo 命令
```

本机验证：

```bash
curl -s http://127.0.0.1:3000 | head
curl -s http://127.0.0.1:8000/health
# 应看到 {"status":"ok",...}
```

---

## 六、Nginx + HTTPS（Certbot）

```bash
sudo cp deploy/nginx-site.conf.example /etc/nginx/sites-available/ai-speaking-trainer
sudo nano /etc/nginx/sites-available/ai-speaking-trainer
# 把 YOUR_DOMAIN 改成你的域名
```

启用站点：

```bash
sudo ln -sf /etc/nginx/sites-available/ai-speaking-trainer /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

申请证书（域名已解析到本机 IP）：

```bash
sudo certbot --nginx -d 你的域名 -d www.你的域名
```

按提示选 **Redirect HTTP to HTTPS**。

---

## 七、上线检查

浏览器打开 `https://你的域名`：

- [ ] Test Library → 打开一套题
- [ ] Listen & Repeat 录音 → 上传 → 出分（/6）
- [ ] Virtual Interview 同上
- [ ] 注册/登录（需 Supabase 已配置 schema + storage）
- [ ] Growth 页有数据

服务器上若评分失败：

```bash
pm2 logs ai-speaking-python --lines 80
pm2 logs ai-speaking-web --lines 40
curl -I https://api.assemblyai.com
```

---

## 八、日常更新

本地 push 到 GitHub 后：

```bash
cd /www/wwwroot/ai-speaking-trainer
bash deploy/update.sh
```

---

## 可选：宝塔面板

若更习惯图形界面，可在 Ubuntu 上再装宝塔，Nginx/SSL 在面板里配，PM2 仍用本仓库的 `deploy/ecosystem.config.cjs`。详见 [`DEPLOY-BAOTA.md`](./DEPLOY-BAOTA.md)。

---

## 香港节点说明

| 项目 | 说明 |
|------|------|
| 备案 | 香港轻量 **不需要** 大陆 ICP 备案 |
| AssemblyAI | 一般可直连；`curl -I https://api.assemblyai.com` 应返回 200/301 |
| 智谱 GLM | 国内 API，香港服务器通常可访问 |
| Supabase | 海外服务，香港访问正常 |
| 内存 | 2GB 够用；同时跑 Next + Python，建议 `pm2 monit` 观察 |

---

## 故障排查

| 现象 | 处理 |
|------|------|
| 网站打不开 | 查防火墙 80/443、Nginx `systemctl status nginx` |
| 录音后一直 Analyzing | `pm2 logs ai-speaking-python`；查 AssemblyAI/GLM key |
| 401 / API key | `PYTHON_SPEECH_API_KEY` 两边不一致 |
| build 报 Port 3000 in use | `pm2 stop ai-speaking-web` 后再 `npm run build` |
| CORS 错误 | `python/.env` 的 `CORS_ORIGINS` 必须是完整 `https://域名`，无末尾 `/` |
