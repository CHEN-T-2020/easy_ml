import express, { Request, Response } from 'express';
import { fileStorage, TextSample } from '../database/FileStorage';
import { ApiResponseHelper } from '../utils/ApiResponse';

const router = express.Router();

// 获取所有样本
router.get('/', ApiResponseHelper.asyncHandler(async (req: Request, res: Response) => {
  const samples = fileStorage.getAllSamples();
  ApiResponseHelper.success(res, samples, '获取样本成功');
}));

// 添加单个样本
router.post('/', ApiResponseHelper.asyncHandler(async (req: Request, res: Response) => {
  const { content, label } = req.body;

  if (!content || !label) {
    return ApiResponseHelper.validationError(res, '内容和标签不能为空');
  }

  if (!['normal', 'clickbait'].includes(label)) {
    return ApiResponseHelper.validationError(res, '标签必须是 normal 或 clickbait');
  }

  // 计算基本特征
  const wordCount = content.trim().split(/\s+/).length;
  const qualityScore = calculateQualityScore(content, label);

  const sample = fileStorage.addSample({
    content: content.trim(),
    label,
    wordCount,
    qualityScore
  });

  ApiResponseHelper.success(res, sample, '样本添加成功', 201);
}));

// 批量上传样本
router.post('/batch', ApiResponseHelper.asyncHandler(async (req: Request, res: Response) => {
  const { texts, label } = req.body;

  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return ApiResponseHelper.validationError(res, '文本数组不能为空');
  }

  if (!['normal', 'clickbait'].includes(label)) {
    return ApiResponseHelper.validationError(res, '标签必须是 normal 或 clickbait');
  }

  const newSamples = texts.map(text => {
    const content = text.trim();
    const wordCount = content.split(/\s+/).length;
    const qualityScore = calculateQualityScore(content, label);

    return {
      content,
      label,
      wordCount,
      qualityScore
    };
  });

  const addedSamples = fileStorage.addBatchSamples(newSamples);

  const stats = fileStorage.getStats();
  
  ApiResponseHelper.success(res, {
    importedCount: addedSamples.length,
    skippedCount: 0,
    normalCount: stats.normalCount,
    clickbaitCount: stats.clickbaitCount,
    samples: addedSamples
  }, `成功导入 ${addedSamples.length} 个样本`);
}));

// 删除样本
router.delete('/:id', ApiResponseHelper.asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    return ApiResponseHelper.validationError(res, '无效的样本ID');
  }

  const deleted = fileStorage.deleteSample(id);
  
  if (deleted) {
    ApiResponseHelper.success(res, null, '样本删除成功');
  } else {
    ApiResponseHelper.notFound(res, '未找到指定样本');
  }
}));

// 获取统计信息
router.get('/stats', ApiResponseHelper.asyncHandler(async (req: Request, res: Response) => {
  const stats = fileStorage.getStats();
  ApiResponseHelper.success(res, stats, '统计信息获取成功');
}));

// 导出所有数据为JSON
router.get('/export', ApiResponseHelper.asyncHandler(async (req: Request, res: Response) => {
  const samples = fileStorage.getAllSamples();
  const history = fileStorage.getAllTrainingHistory();
  
  const exportData = {
    samples,
    history,
    exportedAt: new Date().toISOString(),
    totalSamples: samples.length
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="news-classifier-data.json"');
  res.send(JSON.stringify(exportData, null, 2));
}));

// 数据备份
router.post('/backup', ApiResponseHelper.asyncHandler(async (req: Request, res: Response) => {
  const backup = fileStorage.createBackup();
  ApiResponseHelper.success(res, backup, '数据备份创建成功');
}));

// 健康检查
router.get('/health', ApiResponseHelper.asyncHandler(async (req: Request, res: Response) => {
  const health = fileStorage.healthCheck();
  
  if (health.status === 'healthy') {
    ApiResponseHelper.success(res, health.details, '存储系统健康');
  } else {
    ApiResponseHelper.serverError(res, '存储系统异常', health.details);
  }
}));

// 计算质量评分的辅助函数
function calculateQualityScore(content: string, label: 'normal' | 'clickbait'): number {
  let score = 0.5; // 基础分数

  // 长度评分
  const length = content.length;
  if (length > 10 && length < 200) {
    score += 0.2;
  }

  // 标点符号评分
  const punctuationRatio = (content.match(/[！？。，；：]/g) || []).length / length;
  if (punctuationRatio < 0.1) {
    score += 0.15;
  }

  // 大写字母比例（针对英文）
  const capsRatio = (content.match(/[A-Z]/g) || []).length / length;
  if (capsRatio < 0.1) {
    score += 0.15;
  }

  // 根据标签调整
  if (label === 'normal') {
    // 正常标题通常质量更高
    score += 0.2;
  } else {
    // 标题党通常质量较低
    score -= 0.2;
  }

  // 确保分数在 0-1 范围内
  return Math.max(0, Math.min(1, score));
}

export default router;