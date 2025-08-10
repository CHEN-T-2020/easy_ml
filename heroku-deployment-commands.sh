#!/bin/bash
# Heroku 部署命令集合 - 按顺序执行

echo "🚀 开始 Heroku 部署流程"

# Phase 1: 检查环境
echo "📋 Phase 1: 环境检查"
heroku --version
git --version
pwd

# Phase 2: 部署后端
echo "📋 Phase 2: 部署后端"
cd backend

echo "创建后端应用..."
heroku create

echo "添加 PostgreSQL..."
heroku addons:create heroku-postgresql:mini

echo "设置环境变量..."
heroku config:set NODE_ENV=production
heroku config:set NODE_OPTIONS="--max_old_space_size=400"
heroku config:set ML_MEMORY_LIMIT=400
heroku config:set ML_TIMEOUT=25000
heroku config:set MAX_CONCURRENT_TRAINING=1
heroku config:set CORS_ORIGIN="*"

echo "初始化 Git 并部署..."
git init
git add .
git commit -m "Initial backend deployment"
git push heroku main

echo "测试后端..."
heroku open

# Phase 3: 部署前端  
echo "📋 Phase 3: 部署前端"
cd ../frontend

echo "复制 Heroku 配置..."
cp package-heroku.json package.json

echo "创建前端应用..."
read -p "请输入前端应用名 (或按Enter使用自动生成): " frontend_name
if [ -z "$frontend_name" ]; then
    heroku create
else
    heroku create $frontend_name
fi

echo "设置 buildpacks..."
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-static

echo "设置环境变量..."
read -p "请输入后端应用的URL (如: https://xxx.herokuapp.com): " backend_url
heroku config:set REACT_APP_API_BASE_URL="${backend_url}/api"

echo "初始化 Git 并部署..."
git init  
git add .
git commit -m "Initial frontend deployment"
git push heroku main

echo "更新后端 CORS..."
cd ../backend
frontend_url=$(heroku info -s | grep web_url | cut -d= -f2)
heroku config:set CORS_ORIGIN="$frontend_url"
heroku restart

echo "🎉 部署完成！"
echo "前端: $frontend_url"  
echo "后端: $backend_url"

echo "请访问前端URL测试应用功能"