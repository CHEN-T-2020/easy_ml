# 🚀 部署指南

## 📊 部署概览

本项目采用**前后端分离部署**策略：
- **前端**：Vercel (静态托管 + CDN)
- **后端**：Railway (服务器 + 数据库)
- **成本**：约 $5/月

---

## 🎯 快速部署 (推荐)

### Step 1: 准备代码仓库

```bash
# 1. 推送代码到GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. 确保有这些文件：
# ✅ backend/.env.example
# ✅ frontend/.env.example  
# ✅ backend/railway.json
# ✅ frontend/vercel.json
```

### Step 2: 部署后端 (Railway)

1. **注册 Railway**: https://railway.app
2. **连接GitHub**: 授权Railway访问你的仓库
3. **创建项目**:
   ```
   New Project → Deploy from GitHub repo
   选择你的仓库 → 选择 /backend 文件夹
   ```
4. **添加PostgreSQL**:
   ```
   Add Service → PostgreSQL
   自动生成 DATABASE_URL
   ```
5. **设置环境变量**:
   ```bash
   NODE_ENV=production
   PORT=3001
   CORS_ORIGIN=https://你的前端域名.vercel.app
   # DATABASE_URL 会自动生成
   ```

### Step 3: 部署前端 (Vercel)

1. **注册 Vercel**: https://vercel.com
2. **导入项目**:
   ```
   Add New → Project → Import Git Repository
   选择你的仓库
   Framework Preset: Create React App
   Root Directory: frontend
   ```
3. **设置环境变量**:
   ```bash
   REACT_APP_API_BASE_URL=https://你的后端域名.railway.app/api
   ```

### Step 4: 验证部署

```bash
# 检查后端健康状态
curl https://你的后端域名.railway.app/health

# 检查前端
open https://你的前端域名.vercel.app
```

---

## 🔧 详细配置

### 环境变量配置

**后端环境变量 (Railway)**:
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:port/db  # 自动生成
CORS_ORIGIN=https://your-frontend.vercel.app
LOG_LEVEL=info
ML_MEMORY_LIMIT=512
ML_TIMEOUT=30000
```

**前端环境变量 (Vercel)**:
```env
REACT_APP_API_BASE_URL=https://your-backend.railway.app/api
```

### 自定义域名 (可选)

**Vercel域名**:
1. Settings → Domains → Add Domain
2. 按提示配置DNS记录

**Railway域名**:  
1. Settings → Environment → Custom Domain
2. 输入你的域名并配置DNS

---

## 🚨 常见问题解决

### 1. 后端启动失败
```bash
# 检查日志
railway logs

# 常见原因：
- DATABASE_URL 未设置
- 依赖安装失败
- TypeScript编译错误
```

### 2. 前端API调用失败
```bash
# 检查环境变量
echo $REACT_APP_API_BASE_URL

# 检查CORS设置
# 确保后端CORS_ORIGIN正确
```

### 3. 数据库连接失败
```bash
# 手动运行迁移
npm run migrate

# 检查连接字符串
# Railway会自动提供DATABASE_URL
```

### 4. 构建失败
```bash
# 清理缓存
npm run build --force

# 检查依赖
npm audit fix
```

---

## 📈 扩容和优化

### 性能监控
```bash
# Railway内置监控
Dashboard → Metrics

# Vercel分析
Dashboard → Analytics
```

### 成本优化
- Railway免费额度：$5/月后付费
- Vercel免费额度：100GB带宽/月
- 考虑升级到Railway Pro ($20/月) 获得更多资源

### 备份策略
```bash
# 数据库备份 (Railway自动)
# 手动备份
pg_dump $DATABASE_URL > backup.sql

# 代码备份
git push --all origin
```

---

## 🔄 持续部署 

### 自动部署设置

1. **Railway**: 推送到main分支自动部署
2. **Vercel**: 推送到main分支自动部署
3. **GitHub Actions**: 已配置完整CI/CD流水线

### 部署流程
```bash
# 开发
git checkout -b feature/new-feature
# ... 开发代码 ...
git push origin feature/new-feature

# 创建PR → 自动预览部署

# 合并到main → 自动生产部署
git checkout main
git merge feature/new-feature
git push origin main
```

---

## 📞 支持

如果遇到问题：

1. **查看日志**: Railway/Vercel Dashboard → Logs
2. **检查状态**: https://status.railway.app, https://vercel-status.com  
3. **重新部署**: Dashboard → Deployments → Redeploy

---

## 🎉 部署完成！

成功部署后你将拥有：
- ✅ 全球CDN加速的前端应用
- ✅ 自动扩缩容的后端API 
- ✅ 托管PostgreSQL数据库
- ✅ HTTPS安全连接
- ✅ 持续集成和部署

**预期URLs**:
- 前端: `https://your-project.vercel.app`
- 后端: `https://your-project.railway.app`
- API: `https://your-project.railway.app/api`

享受你的云端新闻分类平台！🚀