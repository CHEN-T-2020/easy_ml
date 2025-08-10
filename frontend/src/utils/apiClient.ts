// 统一的API客户端和错误处理
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiConfig {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
    this.timeout = config.timeout || 30000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    
    // 设置超时
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        throw new ApiError(
          response.status,
          responseData.message || `HTTP ${response.status}`,
          responseData
        );
      }

      return responseData;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(408, 'Request timeout');
      }
      
      // 网络错误或其他错误
      throw new ApiError(0, 'Network error or server unavailable');
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // 批量请求工具
  async batch<T>(requests: Array<() => Promise<ApiResponse<T>>>): Promise<ApiResponse<T>[]> {
    return Promise.allSettled(requests.map(req => req()))
      .then(results => 
        results.map(result => 
          result.status === 'fulfilled' 
            ? result.value 
            : { success: false, error: result.reason.message }
        )
      );
  }
}

// 单例实例
export const apiClient = new ApiClient();

// 错误处理工具
export class ErrorHandler {
  static handle(error: unknown, fallbackMessage: string = '操作失败'): string {
    if (error instanceof ApiError) {
      switch (error.status) {
        case 400:
          return error.message || '请求参数错误';
        case 404:
          return '资源不存在';
        case 408:
          return '请求超时，请稍后重试';
        case 500:
          return '服务器内部错误';
        case 0:
          return '网络连接失败，请检查网络';
        default:
          return error.message || fallbackMessage;
      }
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return fallbackMessage;
  }

  static async withLoading<T>(
    operation: () => Promise<T>,
    setLoading: (loading: boolean) => void
  ): Promise<T> {
    setLoading(true);
    try {
      return await operation();
    } finally {
      setLoading(false);
    }
  }

  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    onError: (message: string) => void
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      onError(ErrorHandler.handle(error));
      return null;
    }
  }
}