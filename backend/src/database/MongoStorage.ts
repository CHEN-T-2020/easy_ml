// 可选方案：MongoDB Atlas (免费版)
// 如果选择此方案，需要：
// 1. 注册 MongoDB Atlas: https://cloud.mongodb.com
// 2. 创建免费集群 (512MB)
// 3. 获取连接字符串
// 4. npm install mongodb mongoose

/*
import mongoose from 'mongoose';

// 样本数据模型
const TextSampleSchema = new mongoose.Schema({
  content: { type: String, required: true },
  label: { type: String, enum: ['normal', 'clickbait'], required: true },
  wordCount: { type: Number, required: true },
  qualityScore: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// 训练历史模型
const TrainingHistorySchema = new mongoose.Schema({
  modelType: { type: String, required: true },
  accuracy: { type: Number, required: true },
  precision: { type: Number, required: true },
  recall: { type: Number, required: true },
  f1Score: { type: Number, required: true },
  trainingTime: { type: Number, required: true },
  sampleCount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const TextSample = mongoose.model('TextSample', TextSampleSchema);
export const TrainingHistory = mongoose.model('TrainingHistory', TrainingHistorySchema);

export class MongoStorage {
  async connect() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/news_classifier');
  }

  async getAllSamples() {
    return await TextSample.find().sort({ createdAt: -1 });
  }

  async addSample(sampleData: any) {
    const sample = new TextSample(sampleData);
    return await sample.save();
  }

  // ... 其他方法
}
*/

// 配置说明：
export const MongoConfig = {
  setup: [
    "1. 注册 MongoDB Atlas: https://cloud.mongodb.com",
    "2. 创建免费集群 (M0, 512MB)",
    "3. 添加数据库用户",
    "4. 获取连接字符串",
    "5. 设置环境变量: MONGODB_URI"
  ],
  dependencies: [
    "npm install mongoose",
    "npm install @types/mongoose --save-dev"
  ],
  herokuConfig: [
    "heroku config:set MONGODB_URI='mongodb+srv://username:password@cluster.mongodb.net/news_classifier'"
  ]
};