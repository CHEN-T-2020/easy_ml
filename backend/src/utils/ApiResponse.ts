import { Response } from 'express';

export interface ApiResponseData<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class ApiResponseHelper {
  /**
   * 发送成功响应
   */
  static success<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = 200
  ): void {
    const response: ApiResponseData<T> = {
      success: true,
      data,
      message
    };
    res.status(statusCode).json(response);
  }

  /**
   * 发送错误响应
   */
  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    error?: any
  ): void {
    const response: ApiResponseData = {
      success: false,
      message,
      error: error instanceof Error ? error.message : error
    };
    res.status(statusCode).json(response);
  }

  /**
   * 发送验证错误响应
   */
  static validationError(
    res: Response,
    message: string,
    details?: any
  ): void {
    ApiResponseHelper.error(res, message, 400, details);
  }

  /**
   * 发送未找到错误响应
   */
  static notFound(
    res: Response,
    message: string = '资源不存在'
  ): void {
    ApiResponseHelper.error(res, message, 404);
  }

  /**
   * 发送服务器错误响应
   */
  static serverError(
    res: Response,
    message: string = '服务器内部错误',
    error?: any
  ): void {
    console.error('Server Error:', error);
    ApiResponseHelper.error(res, message, 500, error);
  }

  /**
   * 包装异步路由处理器，自动捕获错误
   */
  static asyncHandler(
    handler: (req: any, res: Response, next?: any) => Promise<any>
  ) {
    return async (req: any, res: Response, next: any) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        console.error('Async handler error:', error);
        ApiResponseHelper.serverError(res, '处理请求时发生错误', error);
      }
    };
  }

  /**
   * 数据验证装饰器
   */
  static validateData<T>(
    validator: (data: any) => { isValid: boolean; error?: string; data?: T }
  ) {
    return (handler: (req: any, res: Response, data: T) => Promise<void>) => {
      return ApiResponseHelper.asyncHandler(async (req, res) => {
        const validation = validator(req.body);
        if (!validation.isValid) {
          ApiResponseHelper.validationError(res, validation.error || '数据验证失败');
          return;
        }
        await handler(req, res, validation.data!);
      });
    };
  }
}