# 标题党识别文字分类教学平台

基于Teachable Machine设计理念的标题党识别教学平台，帮助学生通过机器学习技术学习识别诱导性标题。

![Platform Demo](https://img.shields.io/badge/Status-Development-orange)
![React](https://img.shields.io/badge/Frontend-React%2BTypeScript-blue)
![Node.js](https://img.shields.io/badge/Backend-Node.js%2BExpress-green)
![Database](https://img.shields.io/badge/Database-PostgreSQL-blue)

## 🌟 功能特性

### ✅ 已完成功能
- **三步式学习流程**：收集数据 → 训练模型 → 测试识别
- **双模式数据输入**：
  - 手动文本输入（支持实时质量评分）
  - 批量TXT文件上传（支持拖拽，换行自动分割）
- **智能样本管理**：
  - 只展示最新3条样本，其他自动折叠
  - 一键展开/收起历史记录
- **实时标题党特征提示**
- **可视化进度指示**
- **响应式界面设计**

### 🚧 开发中功能
- AI模型训练
- 文本分类预测
- 结果分析和可视化

## 🏗️ 项目架构

```
news-classifier-platform/
├── frontend/                 # React前端应用
│   ├── src/
│   │   ├── components/      # UI组件
│   │   │   ├── TextInput.tsx       # 文本输入组件
│   │   │   ├── FileUpload.tsx      # 文件上传组件
│   │   │   ├── SampleList.tsx      # 样本列表组件
│   │   │   ├── SampleCard.tsx      # 样本卡片组件
│   │   │   └── ProgressBar.tsx     # 进度条组件
│   │   ├── utils/           # 工具函数
│   │   └── App.tsx         # 主应用组件
├── backend/                 # Node.js后端API
│   ├── src/
│   │   ├── routes/         # API路由
│   │   ├── models/         # 数据模型
│   │   ├── controllers/    # 控制器
│   │   └── index.ts        # 服务器入口
├── database/               # 数据库结构
│   ├── schema.sql         # 表结构定义
│   └── seeds.sql          # 示例数据
└── docs/                  # 项目文档
```

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0
- PostgreSQL >= 12.0 (可选，当前使用内存存储)

### 安装和运行

1. **克隆项目**
```bash
git clone https://github.com/your-username/news-classifier-platform.git
cd news-classifier-platform
```

2. **启动后端服务**
```bash
cd backend
npm install
npm run dev
```
后端服务将在 `http://localhost:3001` 启动

3. **启动前端应用**
```bash
cd frontend
npm install
npm start
```
前端应用将在 `http://localhost:3000` 启动

### 使用方法

1. **收集数据阶段**：
   - 手动输入：在文本框中输入正常标题或标题党内容
   - 批量上传：拖拽或选择TXT文件，每行一条样本
   - 查看样本：默认显示最新3条，可展开查看全部

2. **训练模型阶段**（开发中）：
   - 自动训练文本分类模型
   - 实时显示训练进度

3. **测试识别阶段**（开发中）：
   - 输入新标题进行分类测试
   - 查看预测结果和置信度

## 📊 API接口

### 文本样本管理
- `GET /api/text-samples` - 获取所有样本
- `POST /api/text-samples` - 添加单个样本
- `POST /api/text-samples/batch` - 批量添加样本
- `DELETE /api/text-samples/:id` - 删除样本
- `GET /api/text-samples/stats` - 获取统计信息

### 请求示例
```bash
# 批量上传样本
curl -X POST http://localhost:3001/api/text-samples/batch \
  -H "Content-Type: application/json" \
  -d '{
    "texts": ["正常标题内容1", "正常标题内容2"],
    "label": "real"
  }'
```

## 🎯 设计理念

本平台参考Google Teachable Machine的设计思路：
- **简单易用**：三步式工作流程，无需机器学习背景
- **即时反馈**：实时质量评分和特征提示
- **可视化学习**：直观的进度指示和结果展示
- **教育导向**：专为课堂教学和学习设计

## 🔧 技术栈

- **前端**：React 18 + TypeScript + 自定义CSS
- **后端**：Node.js + Express + TypeScript
- **数据库**：PostgreSQL（计划）+ 内存存储（当前）
- **开发工具**：ESLint + Prettier + Nodemon

## 📈 开发计划

- [x] **第一阶段**：基础框架搭建 ✅
- [ ] **第二阶段**：机器学习功能集成
- [ ] **第三阶段**：用户认证和数据持久化
- [ ] **第四阶段**：部署和优化

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📝 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👥 致谢

- 感谢Google Teachable Machine提供的设计灵感
- 感谢ML for kids提供的设计灵感
- 感谢所有为媒体素养教育做出贡献的研究者