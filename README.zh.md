# 功能投票平台

![Feature Voting Platform](https://img.shields.io/badge/Status-Active-brightgreen)

[English](README.md) | [Tiếng Việt](README.vi.md) | 简体中文

一个多语言 UI 的功能投票系统，允许用户建议并投票支持新功能。本项目使用 Cloudflare Workers 作为后端，React 作为前端。

## 功能特性

- 🌐 多语言界面（英语、越南语、中文）
- 🔑 SSO 自动登录（主要登录方式——由你的其他应用签发链接直接登录）
- 🗳️ 功能投票（点赞/点踩）
- 🔒 管理员认证
- 📊 统计与数据分析
- 💬 功能评论
- 🔄 用户提交新功能建议
- 📧 建议通过/拒绝的邮件通知
- 📱 移动端友好界面
- 🛡️ reCAPTCHA v3 防护（防垃圾提交）

## 技术架构

- **前端**：Vite + React + TypeScript + Tailwind CSS + shadcn/ui
- **后端**：Cloudflare Workers + D1 (SQLite)
- **托管**：Cloudflare Pages（前端）+ Cloudflare Workers（API）
- **CI/CD**：GitHub Actions
- **通知**：Telegram Bot API（可选）
- **邮件**：Resend API 或 SendGrid（可选，用于用户通知）
- **安全**：Google reCAPTCHA v3（防垃圾提交）

## 项目结构

项目分为两大部分：

### 前端（React + TypeScript + Vite）

```
frontend/
├── public/           # 静态资源与本地化文件
│   ├── _redirects    # Cloudflare Pages 的重定向配置
│   └── locales/      # 语言文件（en、vi、zh）
├── src/
│   ├── components/   # React 组件
│   ├── contexts/     # Context API（认证等）
│   ├── lib/          # 工具函数与 API 客户端
│   ├── pages/        # 主要页面
│   ├── App.tsx       # 主组件
│   └── main.tsx      # 入口文件
└── vite.config.ts    # Vite 配置
```

### 后端（Cloudflare Workers + TypeScript）

```
worker/
├── src/
│   ├── db/           # 数据库结构与查询
│   ├── handlers/     # API 端点处理器
│   ├── middleware/   # 中间件（限流、认证）
│   ├── utils/        # 工具函数
│   └── index.ts      # 入口文件
├── setup-resources.sh # Cloudflare 资源创建脚本
└── wrangler.toml     # Cloudflare Workers 配置
```

## 环境要求

- Node.js 18+ 与 npm
- Cloudflare 账号（用于 Workers、D1 数据库和 KV 存储）
- GitHub 账号
- Telegram 机器人（可选，用于通知）

## 安装与开发

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/feature-voting.git
cd feature-voting
```

### 2. 安装依赖

```bash
# 安装前端依赖
cd frontend
npm install

# 安装 worker 依赖
cd ../worker
npm install
```

### 3. 配置 Cloudflare Workers

1. 登录 Cloudflare CLI：

```bash
npx wrangler login
```

2. 运行资源创建脚本：

```bash
chmod +x setup-resources.sh
./setup-resources.sh
```

该脚本会创建：
- 用于数据存储的 D1 数据库
- 用于限流的 KV 命名空间

3. 设置密钥环境变量：

```bash
npx wrangler secret put ADMIN_TOKEN
# 输入你的管理员令牌

# reCAPTCHA v3（防垃圾提交，必需）
npx wrangler secret put RECAPTCHA_SECRET_KEY
# 输入从 https://www.google.com/recaptcha/admin 获取的 reCAPTCHA 私密密钥

# 如果希望通过 Telegram 接收通知（可选）
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID

# 如果需要发送邮件（可选）
npx wrangler secret put RESEND_API_KEY
```

### 4. 初始化数据库

```bash
# 根据 schema 创建数据库
npx wrangler d1 execute feature-voting-db --file=./src/db/schema.sql
```

### 5. 配置前端环境

在 `frontend` 目录下创建 `.env.local` 文件：

```bash
cd frontend
cp .env.example .env.local
```

编辑 `.env.local` 并更新以下值：

```env
VITE_API_URL=http://localhost:8787
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here
```

### 6. 本地开发

```bash
# 运行 worker 后端
cd worker
npm run dev

# 在另一个终端运行前端
cd frontend
npm run dev
```

前端运行在 http://localhost:5173，worker 后端运行在 http://localhost:8787。

如需使用 SSO 自动登录（主要登录方式），请在 `worker/.dev.vars` 中设置 `SSO_SECRET`：

```bash
# worker/.dev.vars
SSO_SECRET=your-dev-sso-secret
```

如何生成登录链接请参见下文 [SSO 自动登录](#sso-自动登录) 章节。

## 环境变量

### 前端（.env）

```
VITE_API_URL=http://localhost:8787  # Worker API 地址（本地开发）
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key  # reCAPTCHA v3 站点密钥
```

生产环境中，`VITE_API_URL` 应设置为已部署的 worker 地址，例如：
```
VITE_API_URL=https://feature-voting-worker.yourdomain.workers.dev
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

如果使用自定义域名：
```
VITE_API_URL=https://api.idea.yourdomain.com
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

### 后端（wrangler.toml 与密钥）

wrangler.toml 中的配置：
- `name`：Worker 名称
- `APP_URL`：前端地址
- `RECAPTCHA_SITE_KEY`：reCAPTCHA v3 公钥（site key）
- `database_id`：D1 数据库 ID
- `id`：KV 命名空间 ID

密钥环境变量（使用 `wrangler secret put` 设置）：
- `ADMIN_TOKEN`：管理员认证令牌
- `RECAPTCHA_SECRET_KEY`：reCAPTCHA v3 私密密钥（必需）
- `TELEGRAM_BOT_TOKEN`：Telegram 机器人令牌（可选）
- `TELEGRAM_CHAT_ID`：Telegram 聊天 ID（可选）
- `RESEND_API_KEY`：Resend 邮件服务 API 密钥（可选，用于用户通知）
- `SENDGRID_API_KEY`：SendGrid API 密钥（可选，Resend 的替代方案）
- `TURNSTILE_SECRET_KEY`：Cloudflare Turnstile 私密密钥（可选，防滥用）
- `SSO_SECRET`：SSO 自动登录链接的 HMAC 密钥（可选；未设置时 SSO 端点将被禁用）

## 认证方式

本平台支持两种登录方式：

1. **SSO 自动登录（主要方式）**——来自你其他应用的用户通过签名链接自动登录，无需邮箱或 reCAPTCHA。详见下文 [SSO 自动登录](#sso-自动登录)。
2. **Magic Link（邮件登录）**——传统备用方式：用户通过邮箱接收登录链接，需要邮件服务（Resend/SendGrid）和 reCAPTCHA。

对于已接入现有用户体系的生产部署，推荐使用 SSO 方式。

## SSO 自动登录

来自你其他应用的用户打开签名的反馈链接即可自动登录。无需邮箱或 reCAPTCHA——链接本身就是凭证。

### 链接格式

```
{APP_URL}/auth/sso?userId=<externalUserId>&expires=<epoch-ms>&sig=<hex-hmac>
```

| 参数 | 说明 |
|------|------|
| `userId` | 用户在你的外部应用中的 ID（`[A-Za-z0-9_.-]`，最长 128 字符） |
| `expires` | 链接过期时间，Unix **毫秒**时间戳。必须在未来且不超过当前时间 10 分钟（建议生成 `now + 5 min`） |
| `sig` | `HMAC-SHA256("{userId}.{expires}", SSO_SECRET)` 的小写十六进制值 |

首次访问时，系统会创建一个合成邮箱为 `sso-{userId}@sso.local` 的用户；后续访问复用同一账号。链接 5 分钟过期，没有密钥无法伪造。

### 生成链接（在你的其他应用中）

Node.js 示例：

```js
import crypto from "node:crypto";

function buildSSOLink(baseUrl, userId, secret) {
  const expires = Date.now() + 5 * 60 * 1000; // 5 分钟，毫秒
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${userId}.${expires}`)
    .digest("hex"); // 小写十六进制
  const params = new URLSearchParams({ userId, expires: String(expires), sig });
  return `${baseUrl}/auth/sso?${params.toString()}`;
}
```

### 配置

设置 `SSO_SECRET` 密钥（签发链接的应用必须使用同一个值）：

```bash
npx wrangler secret put SSO_SECRET
```

如果未设置 `SSO_SECRET`，SSO 端点将被禁用（返回 503）——绝不降级为无签名登录。

## 部署

本项目已配置 GitHub Actions，推送到 main 分支时自动部署。前端部署到 Cloudflare Pages，后端部署到 Cloudflare Workers。

### GitHub Actions 配置

在你的 GitHub 仓库中添加以下 Secrets：

| 变量名 | 说明 | 是否必需 |
|--------|------|----------|
| `CF_API_KEY` | Cloudflare API 密钥（从 Cloudflare Dashboard > My Profile > API Tokens > Create Token > Edit Cloudflare Workers 模板获取） | 必需 |
| `CF_EMAIL` | 你的 Cloudflare 邮箱（登录 Cloudflare 账号使用的邮箱） | 必需 |
| `CF_ACCOUNT_ID` | Cloudflare 账号 ID（从 Cloudflare Dashboard > Workers & Pages > Overview > Account ID 获取） | 必需 |
| `CF_D1_DATABASE_ID` | D1 数据库 ID（从 Cloudflare Dashboard > Workers & Pages > D1 > Database > Database ID 获取） | 必需 |
| `CF_KV_NAMESPACE_ID` | KV 命名空间 ID（从 Cloudflare Dashboard > Workers & Pages > KV > Namespace ID 获取） | 必需 |
| `ADMIN_TOKEN` | 管理员令牌（创建一个安全的随机字符串） | 必需 |
| `RECAPTCHA_SITE_KEY` | reCAPTCHA v3 站点密钥（从 https://www.google.com/recaptcha/admin 获取） | 必需 |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA v3 私密密钥（从 https://www.google.com/recaptcha/admin 获取） | 必需 |
| `TELEGRAM_BOT_TOKEN` | Telegram 机器人令牌（从 Telegram 的 BotFather 获取） | 可选 |
| `TELEGRAM_CHAT_ID` | Telegram 聊天 ID（接收通知的聊天或频道 ID） | 可选 |
| `RESEND_API_KEY` | Resend API 密钥（从 Resend.com 官网获取） | 可选 |
| `APP_URL` | 前端应用地址（未设置时默认为 https://idea.nginxwaf.me） | 可选 |
| `SSO_SECRET` | SSO 自动登录链接的 HMAC 密钥（与你的其他应用签发链接所用的值保持一致） | 推荐 |

### 如何从 Cloudflare 获取环境变量

1. **CF_API_KEY 与 CF_ACCOUNT_ID**：
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 进入 My Profile > API Tokens > Create Token
   - 选择 "Edit Cloudflare Workers" 模板
   - 创建后复制令牌作为 CF_API_KEY
   - 获取 CF_ACCOUNT_ID：进入 Workers & Pages > Overview，账号 ID 显示在右侧

2. **CF_D1_DATABASE_ID**：
   - 在 Cloudflare Dashboard 中进入 Workers & Pages > D1
   - 选择你的数据库（没有的话新建一个）
   - Database ID 显示在详情页

3. **CF_KV_NAMESPACE_ID**：
   - 在 Cloudflare Dashboard 中进入 Workers & Pages > KV
   - 新建或选择一个命名空间
   - ID 显示在命名空间列表中

4. **RECAPTCHA_SITE_KEY 与 RECAPTCHA_SECRET_KEY**：
   - 进入 [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
   - 点击 "+" 注册新站点
   - 选择 "reCAPTCHA v3"
   - 添加你的域名（例如 `idea.nginxwaf.me`，测试可加 `localhost`）
   - 注册完成后复制 **Site Key**（公钥）和 **Secret Key**（私钥）
   - 将两个密钥都添加到 GitHub Secrets

### 手动部署

```bash
# 部署 worker
cd worker
npm run deploy

# 部署前端
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=feature-voting-frontend
```

## 数据库结构

项目使用 Cloudflare D1 (SQLite)，包含以下表：

- `features`：存储功能条目
- `users`：用户信息
- `user_sessions`：登录会话
- `feature_suggestions`：用户提交的功能建议
- `comments`：功能评论
- `votes`：投票记录

完整 schema 见 `worker/src/db/schema.sql`。

## 安全特性

### reCAPTCHA v3 集成

本应用使用 Google reCAPTCHA v3 防护垃圾提交与滥用，所有表单提交均受保护：

- ✅ 用户登录（magic link 请求）
- ✅ 投票（点赞/点踩）
- ✅ 功能建议
- ✅ 评论
- ✅ 管理员操作（创建/更新功能）

**关键特性：**
- **隐藏徽标**：reCAPTCHA 徽标完全隐藏，不干扰界面
- **基于评分**：使用风险分析评分（0.0 = 机器人，1.0 = 真人）
- **阈值可配置**：默认最低分数 0.5（可在 `worker/src/utils/recaptcha.ts` 调整）
- **优雅降级**：未配置密钥时跳过校验并打印警告

**配置说明：**

详见 [RECAPTCHA_SETUP.md](RECAPTCHA_SETUP.md)，包括：
- 如何获取 reCAPTCHA 密钥
- 配置步骤
- 故障排查指南
- 隐私声明要求

**重要提示：**
- reCAPTCHA v3 在生产环境要求 HTTPS
- 在 reCAPTCHA 管理后台添加你的域名
- 页面需包含隐私声明："This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply."

### 邮件通知

当用户的功能建议被管理员通过或拒绝时，系统会自动发送邮件通知。

**支持的邮件服务：**
- **Resend**（推荐）——现代邮件 API，每月 3,000 封免费额度
- **SendGrid**——常用邮件服务，每天 100 封免费额度

**配置说明：**

详见 [EMAIL_SETUP.md](EMAIL_SETUP.md)，包括：
- 如何配置 Resend 或 SendGrid
- 邮件模板自定义
- 测试与故障排查
- 安全最佳实践

**邮件模板：**
- ✅ **通过通知**：建议被通过并转为功能条目时发送
- ✅ **拒绝通知**：建议被拒绝并附带反馈说明时发送

两种模板均展示建议标题（单语言内容），采用精美的 HTML 设计并提供纯文本回退。

## 自定义

### 更换域名

1. 更新 `wrangler.toml` 中的 `APP_URL`
2. 更新 `wrangler.toml` 中的 `routes`，指向你的 API 域名
3. 在 Cloudflare Pages 设置中配置你的自定义域名

### 添加新语言

1. 在 `frontend/public/locales/` 中创建新的语言文件
2. 在 `frontend/src/lib/i18n.ts` 的 `supportedLngs`/`resources` 中注册语言代码
3. 在 `frontend/src/components/LanguageSwitcher.tsx` 中添加切换入口

界面文案通过语言文件翻译；功能内容本身以单一语言存储。

## API 端点

### 公开 API

- `GET /api/features`：获取功能列表
- `POST /api/features/:id/vote`：为功能投票
- `GET /api/suggestions`：获取功能建议
- `POST /api/suggestions`：提交新的功能建议

### 管理员 API（需要认证）

- `POST /api/admin/features`：创建新功能
- `PUT /api/admin/features/:id`：更新功能
- `DELETE /api/admin/features/:id`：删除功能
- `GET /api/admin/stats`：获取统计数据
- `GET /api/admin/suggestions`：获取待审核的功能建议
- `PUT /api/admin/suggestions/:id/approve`：通过建议
- `PUT /api/admin/suggestions/:id/reject`：拒绝建议

## 贡献

欢迎贡献！请提交 issue 或 pull request。

## 许可证

Apache License 2.0
