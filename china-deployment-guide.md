# 🇨🇳 中国云平台部署指南

## 推荐方案：腾讯云 + 七牛云CDN

### 📋 部署架构
```
用户访问 → 七牛云CDN(前端) → 腾讯云服务器(后端) → 云数据库MySQL
```

## 🚀 详细部署步骤

### Step 1: 腾讯云轻量应用服务器

1. **购买服务器**
   ```
   地域: 北京/上海/广州
   镜像: Ubuntu 20.04 LTS
   配置: 1核2GB内存 50GB SSD
   价格: ¥24/月
   ```

2. **环境配置**
   ```bash
   # 更新系统
   sudo apt update && sudo apt upgrade -y
   
   # 安装Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # 安装PM2
   sudo npm install -g pm2
   
   # 安装Git
   sudo apt install git -y
   ```

3. **部署后端**
   ```bash
   # 克隆代码
   git clone https://github.com/你的用户名/news-classifier-platform.git
   cd news-classifier-platform/backend
   
   # 安装依赖
   npm install
   
   # 构建项目
   npm run build
   
   # 配置环境变量
   cp .env.example .env
   nano .env  # 编辑配置
   
   # 启动应用
   pm2 start dist/index.js --name "news-classifier"
   pm2 startup
   pm2 save
   ```

### Step 2: 腾讯云数据库

1. **购买云数据库**
   ```
   数据库类型: MySQL 8.0
   配置: 1核1GB内存 20GB存储
   网络: VPC(与服务器同一VPC)
   价格: ¥36/月
   ```

2. **数据库配置**
   ```sql
   -- 创建数据库
   CREATE DATABASE news_classifier CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   
   -- 创建用户
   CREATE USER 'app_user'@'%' IDENTIFIED BY '你的密码';
   GRANT ALL PRIVILEGES ON news_classifier.* TO 'app_user'@'%';
   FLUSH PRIVILEGES;
   ```

### Step 3: 七牛云CDN (前端)

1. **上传前端文件**
   ```bash
   # 本地构建
   cd frontend
   npm run build
   
   # 上传到七牛云对象存储
   # 使用七牛云控制台或qshell工具
   ```

2. **CDN配置**
   ```
   源站类型: 对象存储
   加速域名: 你的域名.com
   HTTPS: 开启
   缓存配置: 静态文件缓存1天
   ```

## 🔧 Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name 你的域名.com;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name 你的域名.com;
    
    # SSL证书配置
    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private.key;
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静态文件
    location / {
        proxy_pass https://你的七牛云CDN域名/;
        proxy_set_header Host 你的七牛云CDN域名;
    }
}
```

## 💡 优化建议

### 性能优化
```javascript
// 后端优化
const optimization = {
  // 启用Gzip压缩
  compression: true,
  
  // 设置缓存
  cacheControl: {
    static: '1d',
    api: '5m'
  },
  
  // 连接池优化
  database: {
    max: 5,  // 最大连接数
    min: 1,  // 最小连接数
    acquireTimeoutMillis: 10000
  }
};
```

### 安全配置
```bash
# 防火墙设置
sudo ufw enable
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS

# 定期备份
0 2 * * * /usr/local/bin/backup_script.sh
```

## 📊 成本总结

| 服务 | 配置 | 月费(¥) | 月费($) |
|-----|------|---------|---------|
| 轻量服务器 | 1核2GB | ¥24 | $3.5 |
| 云数据库 | 1核1GB | ¥36 | $5.2 |
| CDN流量 | 100GB | ¥10 | $1.5 |
| 域名 | .com | ¥5 | $0.7 |
| **总计** |  | **¥75** | **$10.9** |

## 🎯 备选方案

### 方案2: 阿里云全家桶
- ECS + RDS + OSS + CDN
- 成本: ~¥80/月 ($12/月)
- 性能稍好，但成本略高

### 方案3: 华为云
- 云耀云服务器 + 云数据库
- 成本: ~¥70/月 ($10/月) 
- 有免费试用额度

## 🔍 域名和备案

### ICP备案要求
```
如果使用国内云服务:
  ✅ 必须进行ICP备案
  ⏰ 备案时间: 1-4周
  📋 需要材料: 身份证、营业执照(企业)、域名证书
```

### 备案流程
1. 在云服务商提交备案申请
2. 上传相关材料
3. 等待初审(1-3天)
4. 管局审核(10-20天)
5. 备案成功，获得备案号

## ⚠️ 注意事项

1. **合规要求**: 确保内容符合国内法规
2. **数据安全**: 用户数据存储在国内
3. **访问速度**: 针对中国用户优化
4. **技术支持**: 7×24小时中文支持