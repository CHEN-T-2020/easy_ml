const API_BASE_URL = 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

interface TextSample {
  id: number;
  content: string;
  label: 'real' | 'fake';
  wordCount: number;
  qualityScore: number;
  createdAt: string;
}

interface BatchUploadResponse {
  importedCount: number;
  skippedCount: number;
  samples: TextSample[];
}

export const api = {
  // 批量上传文本样本
  batchUpload: async (texts: string[], label: 'real' | 'fake'): Promise<ApiResponse<BatchUploadResponse>> => {
    const response = await fetch(`${API_BASE_URL}/text-samples/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts, label }),
    });

    return response.json();
  },

  // 添加单个文本样本
  addSample: async (content: string, label: 'real' | 'fake'): Promise<ApiResponse<TextSample>> => {
    const response = await fetch(`${API_BASE_URL}/text-samples`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, label }),
    });

    return response.json();
  },

  // 获取所有样本
  getSamples: async (): Promise<ApiResponse<TextSample[]>> => {
    const response = await fetch(`${API_BASE_URL}/text-samples`);
    return response.json();
  },

  // 删除样本
  deleteSample: async (id: number): Promise<ApiResponse> => {
    const response = await fetch(`${API_BASE_URL}/text-samples/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  // 获取统计信息
  getStats: async (): Promise<ApiResponse<{
    total: number;
    realCount: number;
    fakeCount: number;
    averageQuality: number;
    canTrain: boolean;
  }>> => {
    const response = await fetch(`${API_BASE_URL}/text-samples/stats`);
    return response.json();
  },
};