import { apiClient, ApiResponse } from './apiClient';

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
    return apiClient.post('/text-samples/batch', { texts, label });
  },

  // 添加单个文本样本
  addSample: async (content: string, label: 'normal' | 'clickbait'): Promise<ApiResponse<TextSample>> => {
    return apiClient.post('/text-samples', { content, label });
  },

  // 获取所有样本
  getSamples: async (): Promise<ApiResponse<TextSample[]>> => {
    return apiClient.get('/text-samples');
  },

  // 删除样本
  deleteSample: async (id: number): Promise<ApiResponse> => {
    return apiClient.delete(`/text-samples/${id}`);
  },

  // 获取统计信息
  getStats: async (): Promise<ApiResponse<{
    total: number;
    normalCount: number;
    clickbaitCount: number;
    averageQuality: number;
    canTrain: boolean;
  }>> => {
    return apiClient.get('/text-samples/stats');
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
      return apiClient.get('/data-manager/datasets/training');
    },

    // 导入训练数据集到系统
    importTrainingDataset: async (): Promise<ApiResponse<BatchUploadResponse>> => {
      return apiClient.post('/data-manager/datasets/training/import');
    },

    // 创建数据备份
    createBackup: async (): Promise<ApiResponse<{ backupId: string }>> => {
      return apiClient.post('/data-manager/backup');
    },

    // 导出数据为CSV
    exportToCSV: async (): Promise<ApiResponse<{
      filename: string;
      totalSamples: number;
      downloadUrl: string;
    }>> => {
      return apiClient.get('/data-manager/export/csv');
    },
  },

  // 模型对比API
  modelComparison: {
    // 获取所有模型信息
    getModels: async () => {
      return apiClient.get('/model-comparison/models');
    },

    // 训练指定模型
    trainModel: async (modelType: string) => {
      return apiClient.post(`/model-comparison/models/${modelType}/train`);
    },

    // 获取训练状态
    getTrainingStatus: async () => {
      return apiClient.get('/model-comparison/training/status');
    },

    // 获取对比摘要
    getSummary: async () => {
      return apiClient.get('/model-comparison/summary');
    },

    // 预测文本
    predict: async (text: string) => {
      return apiClient.post('/model-comparison/predict', { text });
    }
  },
};