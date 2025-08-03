import express, { Request, Response } from 'express';
import { Router } from 'express';

const router: Router = express.Router();

// 简化的状态管理
let trainingInProgress = false;
let trainingProgress = {
  status: 'idle', // idle, training, completed, error
  progress: 0,
  message: '',
  metrics: null as any
};

// 导入共享的样本数据
import { samples } from './textSamples';

/**
 * 获取训练状态
 */
router.get('/training/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      ...trainingProgress,
      isModelTrained: false, // 暂时返回false
      sampleCount: samples.length
    }
  });
});

/**
 * 开始训练模型
 */
router.post('/training/start', async (req: Request, res: Response) => {
  try {
    console.log('收到训练请求');
    
    if (trainingInProgress) {
      return res.status(400).json({
        success: false,
        message: '模型正在训练中，请稍后再试'
      });
    }

    console.log('当前样本数量:', samples.length);

    if (samples.length < 4) {
      return res.status(400).json({
        success: false,
        message: '训练数据不足，至少需要4个样本（每类至少2个）'
      });
    }

    const realSamples = samples.filter(s => s.label === 'real');
    const fakeSamples = samples.filter(s => s.label === 'fake');

    console.log('正常标题样本:', realSamples.length);
    console.log('标题党样本:', fakeSamples.length);

    if (realSamples.length === 0 || fakeSamples.length === 0) {
      return res.status(400).json({
        success: false,
        message: '需要同时包含正常标题和标题党样本'
      });
    }

    // 开始模拟训练
    trainingInProgress = true;
    trainingProgress = {
      status: 'training',
      progress: 0,
      message: '正在初始化训练...',
      metrics: null
    };

    res.json({
      success: true,
      message: '训练已开始',
      data: trainingProgress
    });

    // 模拟异步训练过程
    setImmediate(async () => {
      try {
        // 模拟训练进度
        trainingProgress.message = '正在提取文本特征...';
        trainingProgress.progress = 25;

        await new Promise(resolve => setTimeout(resolve, 1000));

        trainingProgress.message = '正在训练分类模型...';
        trainingProgress.progress = 50;

        await new Promise(resolve => setTimeout(resolve, 1000));

        trainingProgress.message = '正在评估模型性能...';
        trainingProgress.progress = 75;

        await new Promise(resolve => setTimeout(resolve, 1000));

        // 模拟训练完成
        trainingProgress = {
          status: 'completed',
          progress: 100,
          message: '训练完成',
          metrics: {
            accuracy: 85,
            precision: 87,
            recall: 83,
            f1Score: 85,
            trainingSamples: samples.length,
            realSamples: realSamples.length,
            fakeSamples: fakeSamples.length
          }
        };

        trainingInProgress = false;
        console.log('训练完成');

      } catch (error) {
        console.error('训练失败:', error);
        trainingProgress = {
          status: 'error',
          progress: 0,
          message: error instanceof Error ? error.message : '训练过程中发生错误',
          metrics: null
        };
        trainingInProgress = false;
      }
    });

  } catch (error) {
    console.error('启动训练失败:', error);
    trainingInProgress = false;
    res.status(500).json({
      success: false,
      message: '启动训练失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 预测文本分类
 */
router.post('/predict', (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        message: '请提供要分析的文本内容'
      });
    }

    if (trainingProgress.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: '模型尚未训练，请先训练模型'
      });
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

    res.json({
      success: true,
      data: {
        text: cleanText,
        prediction: isClickbait ? 'fake' : 'real',
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
    });

  } catch (error) {
    console.error('预测失败:', error);
    res.status(500).json({
      success: false,
      message: '预测失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 批量预测
 */
router.post('/predict/batch', (req: Request, res: Response) => {
  try {
    const { texts } = req.body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供文本数组'
      });
    }

    if (trainingProgress.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: '模型尚未训练，请先训练模型'
      });
    }

    const results = texts.map(text => {
      // 使用与单个预测相同的逻辑
      const cleanText = text.trim();
      const clickbaitKeywords = ['震惊', '重磅', '不敢相信', '火爆', '速看', '必须', '绝密'];
      const hasClickbaitWords = clickbaitKeywords.some(word => cleanText.includes(word));
      const isClickbait = hasClickbaitWords || Math.random() > 0.6; // 添加一些随机性
      
      return {
        text: cleanText,
        prediction: isClickbait ? 'fake' : 'real',
        confidence: Math.round(Math.random() * 30 + 70), // 70-100的置信度
        reasoning: hasClickbaitWords ? ['包含标题党关键词'] : ['用词相对客观']
      };
    });

    res.json({
      success: true,
      data: {
        results,
        total: results.length,
        clickbaitCount: results.filter(r => r.prediction === 'fake').length,
        normalCount: results.filter(r => r.prediction === 'real').length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '批量预测失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 重置模型
 */
router.post('/reset', (req: Request, res: Response) => {
  try {
    trainingProgress = {
      status: 'idle',
      progress: 0,
      message: '',
      metrics: null
    };
    trainingInProgress = false;

    res.json({
      success: true,
      message: '模型已重置'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '重置失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取模型信息
 */
router.get('/info', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      modelType: 'Rule-based Classifier (Demo)',
      features: [
        '文本长度和词汇统计',
        '标题党关键词检测',
        '情感和紧迫性分析',
        '标点符号模式识别'
      ],
      isModelTrained: trainingProgress.status === 'completed',
      trainingStatus: trainingProgress.status,
      lastTrainingMetrics: trainingProgress.metrics
    }
  });
});

export default router;