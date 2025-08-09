const API_BASE_URL = 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

interface TextSample {
  id: number;
  content: string;
  label: 'normal' | 'clickbait';
  wordCount: number;
  qualityScore: number;
  createdAt: string;
}

interface BatchUploadResponse {
  importedCount: number;
  skippedCount: number;
  normalCount: number;
  clickbaitCount: number;
  samples: TextSample[];
}

export const api = {
  // 批量上传文本样本
  batchUpload: async (texts: string[], label: 'normal' | 'clickbait'): Promise<ApiResponse<BatchUploadResponse>> => {
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
  addSample: async (content: string, label: 'normal' | 'clickbait'): Promise<ApiResponse<TextSample>> => {
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
    normalCount: number;
    clickbaitCount: number;
    averageQuality: number;
    canTrain: boolean;
  }>> => {
    const response = await fetch(`${API_BASE_URL}/text-samples/stats`);
    return response.json();
  },

  // 数据集管理API
  dataManager: {
    // 获取训练数据集信息
    getTrainingDataset: async (): Promise<ApiResponse<{
      name: string;
      description: string;
      totalSamples: number;
      normalCount: number;
      clickbaitCount: number;
    }>> => {
      const response = await fetch(`${API_BASE_URL}/data-manager/datasets/training`);
      return response.json();
    },

    // 导入训练数据集到系统
    importTrainingDataset: async (): Promise<ApiResponse<BatchUploadResponse>> => {
      const response = await fetch(`${API_BASE_URL}/data-manager/datasets/training/import`, {
        method: 'POST',
      });
      return response.json();
    },

    // 创建数据备份
    createBackup: async (): Promise<ApiResponse<{ backupId: string }>> => {
      const response = await fetch(`${API_BASE_URL}/data-manager/backup`, {
        method: 'POST',
      });
      return response.json();
    },

    // 导出数据为CSV
    exportToCSV: async (): Promise<ApiResponse<{
      filename: string;
      totalSamples: number;
      downloadUrl: string;
    }>> => {
      const response = await fetch(`${API_BASE_URL}/data-manager/export/csv`);
      return response.json();
    },
  },
};