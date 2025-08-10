import { CorsOptions } from 'cors';
import { Request } from 'express';

// CORS 配置
export const corsOptions: CorsOptions = {
  origin: function (origin, callback) {
    // 如果设置了 CORS_ORIGIN 环境变量为 "*"，允许所有来源（用于演示）
    if (process.env.CORS_ORIGIN === '*') {
      return callback(null, true);
    }

    // 允许的域名白名单
    const allowedOrigins = [
      'http://localhost:3000', // 开发环境前端
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL, // 生产环境前端
      process.env.CORS_ORIGIN, // 环境变量指定的来源
    ].filter(Boolean); // 过滤掉 undefined

    // 在开发环境或没有 origin 的请求（如直接API访问、Postman）
    if (!origin) {
      return callback(null, true);
    }

    // 检查 origin 是否在白名单中
    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('不被 CORS 策略允许的来源'), false);
    }
  },
  credentials: true, // 允许携带凭证
  optionsSuccessStatus: 200, // 某些浏览器的兼容性设置
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// 请求速率限制配置
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15分钟
  max: process.env.NODE_ENV === 'development' ? 10000 : 100, // 开发环境放宽限制到10000
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Heroku部署需要
  skip: (req: Request) => {
    // 在开发环境中跳过大部分限制
    if (process.env.NODE_ENV === 'development') {
      return true; // 开发环境跳过所有速率限制
    }
    return false; // 生产环境保持限制
  }
};

// 文件上传限制
export const uploadLimits = {
  fileSize: 5 * 1024 * 1024, // 5MB
  files: 10, // 最多10个文件
};

// 文本内容限制
export const textLimits = {
  minLength: 1,
  maxLength: 1000,
  batchSize: 100, // 批量处理时最大数量
};

// 安全头配置
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // 避免一些兼容性问题
};