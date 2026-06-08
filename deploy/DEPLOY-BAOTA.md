# 国内服务器部署（宝塔 + PM2）

一台腾讯云 / 阿里云 **学生轻量机**（1 核 2G）即可。支付宝绑定，约 **9.9 元/月**。

仓库：`https://github.com/DSAFKASDLFLKADSF/AI-speaking-assist`

---

## 架构

```
用户浏览器 ──HTTPS──► Nginx (443) ──► Next.js (127.0.0.1:3000)
                                           │
                                           └──► Python API (127.0.0.1:8000)
Supabase / AssemblyAI / 智谱 GLM（云端 API，不用装在服务器上）
```

**Python 8000 端口不要对公网开放**，只给本机 Next.js 调用。

---

## 一、买服务器 + 装宝塔

1. 腾讯云或阿里云购买 **轻量应用服务器**（推荐 **Ubuntu 22.04**，地域选离用户近的；若 AssemblyAI 转写失败可换 **香港** 节点）
2. 安全组放行：**22、80、443**（不要放行 3000、8000）
3. SSH 登录后安装宝塔（以 Ubuntu 为例，以宝塔官网最新命令为准）：

```bash
wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec
```

4. 宝塔面板 → 安装：**Nginx**、**PM2 管理器**（或 Node 版本管理器）

---

## 二、安装 Node 22 + Python 3.11

### Node（宝塔「Node 版本管理」或 nvm）

```bash
node -v   # 需要 v20+，推荐 v22
npm -v
```

### Python + 系统依赖（librosa 需要）

```bash
sudo apt update
sudo apt install -y git python3.11 python3.11-venv python3-pip ffmpeg libsndfile1
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

---

## 四、配置环境变量

参考 [`deploy/env.server.example`](./env.server.example)，在服务器创建两个文件（**不要提交到 Git**）：

```bash
nano .env.local          # Next.js
nano python/.env         # Python API
```

要点：

| 变量 | 说明 |
|------|------|
| `PYTHON_SPEECH_API_URL` | 固定 `http://127.0.0.1:8000` |
| `PYTHON_SPEECH_API_KEY` | 自己设一串随机密码，**两个文件里必须相同** |
| `CORS_ORIGINS` | `https://你的备案域名`（无末尾斜杠） |
| `NEXT_PUBLIC_APP_URL` | 同上 |
| `DEV_ECHO_REFERENCE` | 生产环境设为 `false` |

Supabase、智谱、AssemblyAI 的 key 从本地 `.env.local` / `python/.env` 复制。

---

## 五、构建并启动

```bash
cd /www/wwwroot/ai-speaking-trainer

# Next.js
npm ci
npm run build

# Python 虚拟环境
cd python
python3.11 -m venv venv
./venv/bin/pip install -r requirements.txt
cd ..

# PM2（配置文件在 deploy/ecosystem.config.cjs）
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup    # 按提示执行一行 sudo 命令，开机自启
```

验证本机：

```bash
curl http://127.0.0.1:3000
curl http://127.0.0.1:8000/health
```

---

## 六、宝塔 Nginx + HTTPS

1. 宝塔 → **网站** → **添加站点** → 填你的 **已备案域名**
2. 站点 → **SSL** → **Let's Encrypt** 申请免费证书（录音功能 **必须 HTTPS**）
3. 站点 → **配置文件**，参考 [`deploy/nginx-site.conf.example`](./nginx-site.conf.example) 确认反代到 `127.0.0.1:3000`
4. 强制 HTTPS 打开

浏览器访问 `https://你的域名`，做一题 Listen & Repeat 测试评分。

---

## 七、以后更新代码

本地 push 到 GitHub 后，在服务器执行：

```bash
cd /www/wwwroot/ai-speaking-trainer
bash deploy/update.sh
```

---

## 常见问题

### 1. `npm run build` 报 Port 3000 is in use

先停 PM2 再构建（`update.sh` 已处理）：

```bash
pm2 stop ai-speaking-web
npm run build
pm2 restart all
```

### 2. 评分失败 / AssemblyAI empty transcript

在服务器测试外网：

```bash
curl -I https://api.assemblyai.com
```

若超时或被墙，换 **香港** 轻量机，或后续改用国内 ASR。

### 3. Python 安装 librosa 失败

确认已安装：`ffmpeg`、`libsndfile1`，并使用 Python 3.11（不要用 3.13+ 做生产）。

### 4. 备案

国内服务器 + 域名通常需要 **ICP 备案** 才能正常用 80/443。未备案可先通过 **服务器公网 IP:端口** 内测（不推荐长期）。

---

## 文件说明

| 文件 | 用途 |
|------|------|
| `deploy/ecosystem.config.cjs` | PM2 同时管 Next.js + Python |
| `deploy/nginx-site.conf.example` | Nginx 反代模板 |
| `deploy/env.server.example` | 环境变量清单 |
| `deploy/update.sh` | 拉代码 + 重新构建 + 重启 |
