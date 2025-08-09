import express, { Request, Response } from 'express';
import { Router } from 'express';

const router: Router = express.Router();

interface TextSample {
  id: number;
  content: string;
  label: 'normal' | 'clickbait';
  wordCount: number;
  qualityScore: number;
  createdAt: Date;
}

let samples: TextSample[] = [];
let nextId = 1;

// 导出样本数据供ML模块使用
export { samples };

// 获取所有文本样本
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: samples,
    total: samples.length
  });
});

// 添加新的文本样本
router.post('/', (req: Request, res: Response) => {
  try {
    const { content, label } = req.body;

    if (!content || !label) {
      return res.status(400).json({
        success: false,
        message: '内容和标签都是必需的'
      });
    }

    if (content.length < 10) {
      return res.status(400).json({
        success: false,
        message: '文本内容至少需要10个字符'
      });
    }

    if (!['normal', 'clickbait'].includes(label)) {
      return res.status(400).json({
        success: false,
        message: '标签必须是 "normal" 或 "clickbait"'
      });
    }

    const wordCount = content.length;
    const qualityScore = calculateQualityScore(content);

    const newSample: TextSample = {
      id: nextId++,
      content,
      label,
      wordCount,
      qualityScore,
      createdAt: new Date()
    };

    samples.push(newSample);

    res.status(201).json({
      success: true,
      data: newSample,
      message: '文本样本添加成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 删除文本样本
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const index = samples.findIndex(sample => sample.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: '未找到该文本样本'
      });
    }

    samples.splice(index, 1);

    res.json({
      success: true,
      message: '文本样本删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 批量添加文本样本
router.post('/batch', (req: Request, res: Response) => {
  try {
    const { texts, label } = req.body;

    if (!texts || !Array.isArray(texts) || !label) {
      return res.status(400).json({
        success: false,
        message: '文本数组和标签都是必需的'
      });
    }

    if (!['normal', 'clickbait'].includes(label)) {
      return res.status(400).json({
        success: false,
        message: '标签必须是 "normal" 或 "clickbait"'
      });
    }

    const validTexts = texts.filter(text => 
      typeof text === 'string' && text.trim().length >= 10
    );

    if (validTexts.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有有效的文本样本（每条至少10个字符）'
      });
    }

    const newSamples: TextSample[] = validTexts.map(content => {
      const trimmedContent = content.trim();
      const wordCount = trimmedContent.length;
      const qualityScore = calculateQualityScore(trimmedContent);

      return {
        id: nextId++,
        content: trimmedContent,
        label,
        wordCount,
        qualityScore,
        createdAt: new Date()
      };
    });

    samples.push(...newSamples);

    res.status(201).json({
      success: true,
      data: {
        importedCount: newSamples.length,
        skippedCount: texts.length - validTexts.length,
        samples: newSamples
      },
      message: `成功导入 ${newSamples.length} 条样本`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取统计信息
router.get('/stats', (req: Request, res: Response) => {
  const normalSamples = samples.filter(s => s.label === 'normal');
  const clickbaitSamples = samples.filter(s => s.label === 'clickbait');

  res.json({
    success: true,
    data: {
      total: samples.length,
      normalCount: normalSamples.length,
      clickbaitCount: clickbaitSamples.length,
      averageQuality: samples.length > 0 
        ? samples.reduce((sum, s) => sum + s.qualityScore, 0) / samples.length 
        : 0,
      canTrain: normalSamples.length >= 3 && clickbaitSamples.length >= 3
    }
  });
});

// 计算文本质量评分的简单算法
function calculateQualityScore(content: string): number {
  let score = 0;

  // 基础长度评分
  if (content.length >= 50) score += 0.4;
  else if (content.length >= 20) score += 0.2;

  // 标点符号评分
  const punctuationCount = (content.match(/[。！？；：，]/g) || []).length;
  if (punctuationCount >= 2) score += 0.2;

  // 数字和具体信息评分
  const numberCount = (content.match(/\d+/g) || []).length;
  if (numberCount > 0) score += 0.1;

  // 避免过度夸张词汇（针对标题党）
  const exaggeratedWords = ['震惊', '重大发现', '不敢相信', '马上转发', '不转不是'];
  const hasExaggeration = exaggeratedWords.some(word => content.includes(word));
  if (hasExaggeration) score -= 0.3;

  // 确保评分在0-1之间
  return Math.max(0, Math.min(1, score));
}

export default router;