# Heroku 部署准备清单

## 📝 必备账号和工具

### 1. 注册 Heroku 账号
- [ ] 访问 https://signup.heroku.com/
- [ ] 填写邮箱、密码
- [ ] 验证邮箱
- [ ] 记录登录信息

### 2. 安装 Heroku CLI
```bash
# macOS (使用 Homebrew)
brew tap heroku/brew && brew install heroku

# Windows (下载安装包)
# 访问 https://devcenter.heroku.com/articles/heroku-cli#download-and-install

# Ubuntu/Debian
curl https://cli-assets.heroku.com/install.sh | sh
```

### 3. 验证安装
```bash
heroku --version
# 应该显示类似: heroku/8.x.x
```

### 4. 登录 Heroku
```bash
heroku login
# 会打开浏览器，点击登录按钮
```

## 🔧 Git 准备
```bash
# 检查 Git 版本
git --version

# 如果没有安装 Git：
# macOS: brew install git
# Windows: https://git-scm.com/download/win
# Ubuntu: sudo apt install git
```

## 💳 准备付费
- [ ] 添加信用卡到 Heroku 账户 (billing.heroku.com)
- [ ] 了解计费详情：
  - Eco Dyno: $5/月 
  - PostgreSQL Mini: $9/月

## ✅ 完成确认
- [ ] Heroku CLI 安装成功
- [ ] 已登录 Heroku 账户  
- [ ] Git 配置正常
- [ ] 信用卡已添加