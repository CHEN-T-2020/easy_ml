// Heroku Eco 优化配置建议

// 1. 内存优化配置
const memoryOptimization = {
  // 限制 Node.js 内存使用
  NODE_OPTIONS: '--max_old_space_size=400', // 限制为400MB
  
  // ML模型优化
  ML_CONFIG: {
    maxSequenceLength: 30,     // 减少到30 (原50)
    numTrees: 20,             // 减少到20 (原50) 
    cnnEpochs: 5,             // 减少到5 (原10)
    timeout: 20000            // 20秒超时
  },

  // 并发控制
  MAX_CONCURRENT_TRAINING: 1, // 同时只允许1个训练任务
  MAX_CONCURRENT_PREDICTION: 3 // 同时最多3个预测任务
};

// 2. Heroku Procfile 配置
/*
web: node --max_old_space_size=400 dist/index.js
worker: node --max_old_space_size=200 dist/worker.js
*/

// 3. 请求队列管理
const requestQueue = {
  // 训练任务排队
  trainingQueue: [],
  isTraining: false,
  
  async addTrainingTask(task) {
    if (this.isTraining) {
      throw new Error('训练正在进行中，请稍后再试');
    }
    this.isTraining = true;
    try {
      await task();
    } finally {
      this.isTraining = false;
    }
  }
};

// 4. 数据库连接池优化
const dbConfig = {
  max: 2,                    // 最多2个连接 (默认10个)
  idleTimeoutMillis: 10000,  // 10秒空闲超时
  connectionTimeoutMillis: 3000 // 3秒连接超时
};

// 5. 缓存策略
const cacheConfig = {
  // 缓存训练好的模型特征
  CACHE_TRAINED_MODELS: true,
  CACHE_FEATURE_VECTORS: true,
  CACHE_TTL: 3600000 // 1小时
};

module.exports = {
  memoryOptimization,
  requestQueue,
  dbConfig,
  cacheConfig
};