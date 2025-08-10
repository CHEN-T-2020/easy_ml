# 🔧 Heroku 部署问题排查指南

## 常见错误和解决方案

### 1. "heroku: command not found"
**解决方案:**
```bash
# macOS
brew install heroku/brew/heroku

# 重新打开终端后再试
heroku --version
```

### 2. "not logged in"
**解决方案:**
```bash
heroku login
# 按任意键打开浏览器登录
```

### 3. 应用名已存在
**错误信息:** `Name xxx is already taken`
**解决方案:**
```bash
# 使用自动生成的名称
heroku create

# 或使用更独特的名称
heroku create your-name-news-classifier-$(date +%s)
```

### 4. 内存不足错误
**错误信息:** `R14 - Memory quota exceeded`
**解决方案:**
```bash
# 检查内存设置
heroku config:get NODE_OPTIONS

# 重新设置内存限制
heroku config:set NODE_OPTIONS="--max_old_space_size=400"
```

### 5. 数据库连接失败
**错误信息:** `database connection failed`
**解决方案:**
```bash
# 检查数据库是否已添加
heroku addons

# 检查数据库URL
heroku config:get DATABASE_URL

# 重启应用
heroku restart
```

### 6. 构建失败 - TypeScript 错误
**解决方案:**
```bash
# 本地先构建测试
cd backend
npm run build

# 如果有错误，修复后重新提交
git add .
git commit -m "Fix build errors"
git push heroku main
```

### 7. 前端无法访问后端 API
**错误信息:** `Network Error` 或 `CORS error`
**解决方案:**
```bash
# 检查后端 CORS 设置
heroku config:get CORS_ORIGIN

# 重新设置正确的前端URL
heroku config:set CORS_ORIGIN="https://your-frontend-app.herokuapp.com"

# 检查前端 API 配置
heroku config:get REACT_APP_API_BASE_URL
```

### 8. 应用启动慢或超时
**原因:** Heroku Eco 可能需要冷启动时间
**解决方案:**
```bash
# 查看应用日志
heroku logs --tail

# 如果超时，考虑升级到 Basic dyno
heroku ps:scale web=1 --type=basic
```

## 🆘 获取帮助的方法

### 查看日志
```bash
# 查看实时日志
heroku logs --tail

# 查看最近500行日志
heroku logs -n 500

# 查看特定应用日志
heroku logs --app your-app-name
```

### 检查应用状态
```bash
# 查看应用信息
heroku info

# 查看运行的进程
heroku ps

# 查看配置变量
heroku config
```

### 重启应用
```bash
# 重启应用
heroku restart

# 重启特定的 dyno
heroku restart web.1
```

## 💡 性能优化建议

### 1. 减少冷启动时间
```javascript
// 在 backend/src/index.ts 添加
app.get('/ping', (req, res) => res.send('pong'));

// 定期ping应用保持活跃 (可选)
```

### 2. 优化依赖包大小
```bash
# 清理不必要的依赖
npm audit
npm prune --production
```

### 3. 启用 Gzip 压缩
```javascript
// 在 express 应用中添加
const compression = require('compression');
app.use(compression());
```

## 📞 联系支持

如果遇到无法解决的问题：
1. 复制完整的错误信息
2. 运行 `heroku logs --tail` 获取详细日志
3. 记录你执行的具体步骤
4. 联系我或查看 Heroku 文档