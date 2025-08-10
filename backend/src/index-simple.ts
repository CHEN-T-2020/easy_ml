import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
// 使用文件存储版本的路由
import textSamplesRouter from './routes/textSamples-file';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/text-samples', textSamplesRouter);

app.get('/', (req: Request, res: Response) => {
  res.json({ message: '标题党识别平台 API 服务已启动' });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});