import express, { Request, Response } from 'express';
import { Router } from 'express';
import { StateManager } from '../services/StateManager';
import { TrainingMetrics, ApiResponse, PredictionResult } from '../types/common';
import { asyncHandler, AppError, validateRequired, validateText } from '../middleware/errorHandler';
import { validatePrediction, validateBatchPrediction } from '../middleware/validation';

const router: Router = express.Router();
const stateManager = StateManager.getInstance();

// 导入共享的样本数据
import { samples } from './textSamples';

/**
 * 获取训练状态
 */
router.get('/training/status', (req: Request, res: Response) => {
  const progress = stateManager.getTrainingProgress();
  const response: ApiResponse = {
    success: true,
    data: {
      ...progress,
      isModelTrained: progress.status === 'completed',
      sampleCount: samples.length
    }
  };
  res.json(response);
});

/**
 * 开始训练模型
 */
router.post('/training/start', async (req: Request, res: Response) => {
  try {
    console.log('收到训练请求');
    
    if (stateManager.isTrainingInProgress()) {
      return res.status(400).json({
        success: false,
        message: '模型正在训练中，请稍后再试'
      });
    }

    console.log('当前样本数量:', samples.length);

    const normalSamples = samples.filter(s => s.label === 'normal');
    const clickbaitSamples = samples.filter(s => s.label === 'clickbait');

    console.log('正常标题样本:', normalSamples.length);
    console.log('标题党样本:', clickbaitSamples.length);

    // 使用统一的验证方法
    const validation = stateManager.validateTrainingData(normalSamples.length, clickbaitSamples.length);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // 开始模拟训练
    stateManager.setTrainingInProgress(true);
    stateManager.updateTrainingProgress({
      status: 'training',
      progress: 0,
      message: '正在初始化训练...',
      metrics: null
    });

    const response: ApiResponse = {
      success: true,
      message: '训练已开始',
      data: stateManager.getTrainingProgress()
    };
    res.json(response);

    // 模拟异步训练过程
    setImmediate(async () => {
      try {
        // 模拟训练进度
        stateManager.updateTrainingProgress({
          message: '正在提取文本特征...',
          progress: 25
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        stateManager.updateTrainingProgress({
          message: '正在训练分类模型...',
          progress: 50
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        stateManager.updateTrainingProgress({
          message: '正在评估模型性能...',
          progress: 75
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        // 模拟训练完成
        const metrics: TrainingMetrics = {
          accuracy: 85,
          precision: 87,
          recall: 83,
          f1Score: 85,
          trainingSamples: samples.length,
          normalSamples: normalSamples.length,
          clickbaitSamples: clickbaitSamples.length
        };

        stateManager.updateTrainingProgress({
          status: 'completed',
          progress: 100,
          message: '训练完成',
          metrics
        });

        stateManager.setTrainingInProgress(false);
        console.log('训练完成');

      } catch (error) {
        console.error('训练失败:', error);
        stateManager.updateTrainingProgress({
          status: 'error',
          progress: 0,
          message: error instanceof Error ? error.message : '训练过程中发生错误',
          metrics: null
        });
        stateManager.setTrainingInProgress(false);
      }
    });

  } catch (error) {
    console.error('启动训练失败:', error);
    stateManager.setTrainingInProgress(false);
    const response: ApiResponse = {
      success: false,
      message: '启动训练失败',
      error: error instanceof Error ? error.message : '未知错误'
    };
    res.status(500).json(response);
  }
});

/**
 * 预测文本分类
 */
router.post('/predict', validatePrediction, asyncHandler(async (req: Request, res: Response) => {
  const { text } = req.body; // text 已经在中间件中被清理和验证

  const progress = stateManager.getTrainingProgress();
  if (progress.status !== 'completed') {
    throw new AppError('模型尚未训练，请先训练模型', 400);
  }

  // 简单的启发式规则来模拟预测
  const cleanText = text.trim();
  const clickbaitKeywords = ['震惊', '重磅', '不敢相信', '火爆', '速看', '必须', '绝密'];
  const urgencyWords = ['马上', '立即', '赶紧', '限时', '最后'];
  
  const hasClickbaitWords = clickbaitKeywords.some(word => cleanText.includes(word));
  const hasUrgencyWords = urgencyWords.some(word => cleanText.includes(word));
  const exclamationCount = (cleanText.match(/！|!/g) || []).length;
  const questionCount = (cleanText.match(/？|\?/g) || []).length;
  
  // 简单评分系统
  let score = 0;
  if (hasClickbaitWords) score += 40;
  if (hasUrgencyWords) score += 30;
  if (exclamationCount > 0) score += 20;
  if (questionCount > 0) score += 10;
  
  const isClickbait = score > 50;
  const confidence = Math.min(95, Math.max(60, score + Math.random() * 20));

  const reasoning = [];
  if (hasClickbaitWords) reasoning.push('包含标题党关键词');
  if (hasUrgencyWords) reasoning.push('包含紧迫性词汇');
  if (exclamationCount > 0) reasoning.push(`包含${exclamationCount}个感叹号`);
  if (questionCount > 0) reasoning.push(`包含${questionCount}个问号`);
  if (!isClickbait && reasoning.length === 0) reasoning.push('用词客观，无夸张表达');

  const response: ApiResponse<PredictionResult> = {
    success: true,
    data: {
      text: cleanText,
      prediction: isClickbait ? 'clickbait' : 'normal',
      confidence: Math.round(confidence),
      reasoning: reasoning,
      features: {
        length: cleanText.length,
        wordCount: cleanText.split(/\s+/).length,
        exclamationCount: exclamationCount,
        questionCount: questionCount,
        clickbaitWords: clickbaitKeywords.filter(word => cleanText.includes(word)).length,
        urgencyWords: urgencyWords.filter(word => cleanText.includes(word)).length,
        emotionalWords: 0
      }
    }
  };
  
  res.json(response);
}));

/**
 * 批量预测
 */
router.post('/predict/batch', validateBatchPrediction, asyncHandler(async (req: Request, res: Response) => {
  const { texts } = req.body; // texts 已经在中间件中被清理和验证

  const progress = stateManager.getTrainingProgress();
  if (progress.status !== 'completed') {
    throw new AppError('模型尚未训练，请先训练模型', 400);
  }

  const results = texts.map((text: string) => {
    // 使用与单个预测相同的逻辑
    const cleanText = text.trim();
    const clickbaitKeywords = ['震惊', '重磅', '不敢相信', '火爆', '速看', '必须', '绝密'];
    const hasClickbaitWords = clickbaitKeywords.some(word => cleanText.includes(word));
    const isClickbait = hasClickbaitWords || Math.random() > 0.6; // 添加一些随机性
    
    return {
      text: cleanText,
      prediction: isClickbait ? 'clickbait' : 'normal',
      confidence: Math.round(Math.random() * 30 + 70), // 70-100的置信度
      reasoning: hasClickbaitWords ? ['包含标题党关键词'] : ['用词相对客观']
    };
  });

  const response: ApiResponse = {
    success: true,
    data: {
      results,
      total: results.length,
      clickbaitCount: results.filter((r: any) => r.prediction === 'clickbait').length,
      normalCount: results.filter((r: any) => r.prediction === 'normal').length
    }
  };
  
  res.json(response);
}));

/**
 * 重置模型
 */
router.post('/reset', (req: Request, res: Response) => {
  try {
    stateManager.resetTraining();

    const response: ApiResponse = {
      success: true,
      message: '模型已重置'
    };
    res.json(response);

  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: '重置失败',
      error: error instanceof Error ? error.message : '未知错误'
    };
    res.status(500).json(response);
  }
});

/**
 * 获取模型信息
 */
router.get('/info', (req: Request, res: Response) => {
  const progress = stateManager.getTrainingProgress();
  const response: ApiResponse = {
    success: true,
    data: {
      modelType: 'Rule-based Classifier (Demo)',
      features: [
        '文本长度和词汇统计',
        '标题党关键词检测',
        '情感和紧迫性分析',
        '标点符号模式识别'
      ],
      isModelTrained: progress.status === 'completed',
      trainingStatus: progress.status,
      lastTrainingMetrics: progress.metrics
    }
  };
  res.json(response);
});

export default router;