import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { corsOptions, rateLimitConfig, helmetConfig } from './config/security';
// 使用文件存储版本的路由
import textSamplesRouter from './routes/textSamples-file';
import mlRouter from './routes/ml';
import modelComparisonRouter from './routes/modelComparison';
import datasetManagerRouter from './routes/datasetManager';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet(helmetConfig));
app.use(cors(corsOptions));
app.use(rateLimit(rateLimitConfig));
app.use(morgan('combined'));
app.use(express.json({ limit: '5mb' })); // 减少限制以防止恶意攻击
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 路由
app.use('/api/text-samples', textSamplesRouter);
app.use('/api/ml', mlRouter);
app.use('/api/model-comparison', modelComparisonRouter);
app.use('/api/data-manager', datasetManagerRouter);

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: '标题党识别平台 API 服务已启动' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 全局错误处理中间件 - 必须放在所有路由之后
app.use(errorHandler);

// 404 处理
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `路由 ${req.originalUrl} 不存在`
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});