import express, { Request, Response } from 'express';
import { fileStorage } from '../database/FileStorage';
import { ApiResponseHelper } from '../utils/ApiResponse';

const router = express.Router();

// 获取训练数据集信息
router.get('/datasets/training', ApiResponseHelper.asyncHandler(async (req: Request, res: Response) => {
  try {
    // 检查预设训练数据文件是否存在
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    
    const datasetPath = join(__dirname, '../../../data/datasets/training_100_samples.json');
    
    if (!existsSync(datasetPath)) {
      return ApiResponseHelper.notFound(res, '训练数据集不存在');
    }

    // 读取数据集基本信息
    const { readFileSync } = await import('fs');
    const datasetContent = readFileSync(datasetPath, 'utf-8');
    const dataset = JSON.parse(datasetContent);

    ApiResponseHelper.success(res, {
      name: dataset.name || '标题党识别训练数据集',
      description: dataset.description || '包含正常标题和标题党的训练数据集',
      totalSamples: dataset.totalSamples || 100,
      normalCount: dataset.normalCount || 50,
      clickbaitCount: dataset.clickbaitCount || 50
    }, '获取训练数据集信息成功');
  } catch (error) {
    ApiResponseHelper.serverError(res, '获取训练数据集信息失败', error instanceof Error ? error.message : '未知错误');
  }
}));

// 导入训练数据集到系统
router.post('/datasets/training/import', ApiResponseHelper.asyncHandler(async (req: Request, res: Response) => {
  const result = fileStorage.loadPresetTrainingData();
  
  if (result.success) {
    // 获取统计信息
    const stats = fileStorage.getStats();
    
    ApiResponseHelper.success(res, {
      importedCount: result.count || 0,
      normalCount: stats.normalCount,
      clickbaitCount: stats.clickbaitCount,
      samples: []  // 不返回具体样本数据，减少响应大小
    }, result.message);
  } else {
    ApiResponseHelper.serverError(res, result.message);
  }
}));

// 创建数据备份
router.post('/backup', ApiResponseHelper.asyncHandler(async (req: Request, res: Response) => {
  const backup = fileStorage.createBackup();
  ApiResponseHelper.success(res, backup, '数据备份创建成功');
}));

// 导出数据为CSV (简化版本)
router.get('/export/csv', ApiResponseHelper.asyncHandler(async (req: Request, res: Response) => {
  const samples = fileStorage.getAllSamples();
  const stats = fileStorage.getStats();
  
  // 简单的CSV导出逻辑
  ApiResponseHelper.success(res, {
    filename: `export_${new Date().toISOString().slice(0, 10)}.csv`,
    totalSamples: stats.total,
    downloadUrl: '/api/text-samples/export' // 重定向到现有的导出功能
  }, '数据导出成功');
}));

// 获取数据统计信息
router.get('/stats', ApiResponseHelper.asyncHandler(async (req: Request, res: Response) => {
  const stats = fileStorage.getStats();
  const health = fileStorage.healthCheck();
  
  ApiResponseHelper.success(res, {
    ...stats,
    healthStatus: health.status,
    lastUpdated: new Date().toISOString()
  }, '获取统计信息成功');
}));

export default router;