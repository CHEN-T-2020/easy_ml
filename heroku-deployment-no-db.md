# 🚀 Heroku 部署指南 (无数据库版本)

## 💰 成本节省
- 原方案: Heroku Eco + PostgreSQL = $14/月
- **新方案: 仅 Heroku Eco = $5/月**
- **节省: $9/月 (64%成本降低!)**

## 📋 部署步骤

### Step 1: 环境检查
```bash
cd /Users/chen/Desktop/cursor/easy_ml/news-classifier-platform
heroku --version
heroku auth:whoami
git status
```

### Step 2: 部署后端
```bash
# 进入后端目录
cd backend

# 创建 Heroku 应用
heroku create

# 设置环境变量 (无需数据库配置!)
heroku config:set NODE_ENV=production
heroku config:set NODE_OPTIONS="--max_old_space_size=400"
heroku config:set ML_MEMORY_LIMIT=400
heroku config:set ML_TIMEOUT=25000
heroku config:set MAX_CONCURRENT_TRAINING=1
heroku config:set STORAGE_TYPE=file

# 初始化 Git 并部署
git init
git add .
git commit -m "Initial backend deployment - file storage"
git push heroku main

# 测试后端
heroku open
```

### Step 3: 部署前端
```bash
# 回到根目录，进入前端
cd ../frontend

# 复制 Heroku 配置
cp package-heroku.json package.json

# 创建前端应用
heroku create your-frontend-name

# 设置 buildpacks
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-static

# 设置 API 地址
heroku config:set REACT_APP_API_BASE_URL="https://your-backend-app.herokuapp.com/api"

# 部署
git init
git add .
git commit -m "Initial frontend deployment"
git push heroku main
```

### Step 4: 连接前后端
```bash
# 回到后端目录更新 CORS
cd ../backend
heroku config:set CORS_ORIGIN="https://your-frontend-app.herokuapp.com"
heroku restart
```

## ✅ 验证部署

### 功能测试清单:
- [ ] 前端页面正常加载
- [ ] 可以添加文本样本
- [ ] 可以查看样本列表
- [ ] 可以删除样本
- [ ] 可以训练模型
- [ ] 可以进行文本分类

### API 测试:
```bash
# 健康检查
curl https://your-backend-app.herokuapp.com/health

# 存储健康检查
curl https://your-backend-app.herokuapp.com/api/text-samples/health

# 获取统计信息
curl https://your-backend-app.herokuapp.com/api/text-samples/stats
```

## 🔧 文件存储说明

### 数据存储位置:
- **开发环境**: `data/persistent/` 目录
- **生产环境**: `/tmp/data/` 目录 (Heroku临时存储)

### 数据持久性:
- ⚠️ **重要**: Heroku 每次部署或重启会清空临时文件
- 📝 **建议**: 定期导出数据备份
- 💡 **优势**: 对于测试和小规模使用完全足够

### 备份和导出:
```bash
# 导出所有数据
curl https://your-backend-app.herokuapp.com/api/text-samples/export > backup.json

# 创建备份
curl -X POST https://your-backend-app.herokuapp.com/api/text-samples/backup
```

## 🎯 适用场景

### ✅ 适合的使用场景:
- 个人项目和原型开发
- 小规模团队使用 (3-10人)
- 临时性的数据存储需求
- 成本敏感的项目

### ⚠️ 限制:
- 数据不会永久保存 (Heroku重启会丢失)
- 不适合大量数据存储
- 并发访问能力有限

### 🔄 升级路径:
如果后期需要持久化数据库，可以轻松升级到:
- Heroku PostgreSQL ($9/月)
- MongoDB Atlas 免费版
- 外部数据库服务

## 🎉 部署成功后

你将拥有:
- ✅ 功能完整的新闻分类平台
- ✅ 仅 $5/月 的超低成本
- ✅ 快速响应的用户界面
- ✅ 完整的 ML 训练和预测功能

**总部署时间: 约30分钟**
**月度成本: 仅 $5 (节省64%)**