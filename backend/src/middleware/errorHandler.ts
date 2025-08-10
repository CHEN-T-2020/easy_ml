import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/common';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// 全局错误处理中间件
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = '服务器内部错误';
  let shouldLogError = true;

  // 处理自定义应用错误
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    shouldLogError = error.statusCode >= 500;
  }

  // 处理常见的系统错误
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = '数据验证失败';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = '数据格式错误';
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    statusCode = 400;
    message = 'JSON格式错误';
  }

  // 记录错误日志
  if (shouldLogError) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.error(`Status: ${statusCode}, Message: ${message}`);
    console.error('Stack:', error.stack);
  }

  // 构建统一的错误响应
  const response: ApiResponse = {
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };

  res.status(statusCode).json(response);
};

// 异步路由包装器，自动捕获异步错误
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 输入验证工具
export const validateRequired = (fields: { [key: string]: any }, requiredFields: string[]): void => {
  const missingFields: string[] = [];
  
  requiredFields.forEach(field => {
    if (!fields[field] || (typeof fields[field] === 'string' && fields[field].trim() === '')) {
      missingFields.push(field);
    }
  });

  if (missingFields.length > 0) {
    throw new AppError(`缺少必填字段: ${missingFields.join(', ')}`, 400);
  }
};

// 文本验证工具
export const validateText = (text: string, minLength: number = 1, maxLength: number = 1000): void => {
  if (typeof text !== 'string') {
    throw new AppError('文本内容必须是字符串', 400);
  }
  
  const trimmedText = text.trim();
  
  if (trimmedText.length < minLength) {
    throw new AppError(`文本长度不能少于 ${minLength} 个字符`, 400);
  }
  
  if (trimmedText.length > maxLength) {
    throw new AppError(`文本长度不能超过 ${maxLength} 个字符`, 400);
  }
};