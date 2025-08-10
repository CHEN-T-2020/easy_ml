import express, { Request, Response } from 'express';
import { Router } from 'express';
import { ModelComparison, ModelType } from '../ml/ModelComparison';
import { fileStorage } from '../database/FileStorage';

const router: Router = express.Router();

// 创建模型对比实例
const modelComparison = new ModelComparison();

/**
 * 获取所有模型信息
 */
router.get('/models', (req: Request, res: Response) => {
  try {
    const modelsInfo = modelComparison.getAllModelsInfo();
    const trainedModels = modelComparison.getTrainedModels();
    const trainingStatus = modelComparison.getTrainingStatus();
    
    res.json({
      success: true,
      data: {
        models: modelsInfo,
        trainedModels,
        trainingStatus,
        totalSamples: fileStorage.getAllSamples().length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取模型信息失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 训练指定模型
 */
router.post('/models/:modelType/train', async (req: Request, res: Response) => {
  try {
    const modelType = req.params.modelType as ModelType;
    
    if (!['random_forest', 'logistic_regression'].includes(modelType)) {
      return res.status(400).json({
        success: false,
        message: '无效的模型类型'
      });
    }

    const samples = fileStorage.getAllSamples();
    if (samples.length < 4) {
      return res.status(400).json({
        success: false,
        message: '训练数据不足，至少需要4个样本'
      });
    }

    const normalSamples = samples.filter(s => s.label === 'normal');
    const clickbaitSamples = samples.filter(s => s.label === 'clickbait');

    if (normalSamples.length === 0 || clickbaitSamples.length === 0) {
      return res.status(400).json({
        success: false,
        message: '需要同时包含正常标题和标题党样本'
      });
    }

    // 转换数据格式
    const trainingData = samples.map(sample => ({
      text: sample.content,
      label: sample.label
    }));

    // 开始训练
    res.json({
      success: true,
      message: `开始训练${modelType}模型`,
      data: {
        modelType,
        trainingStarted: true
      }
    });

    // 异步训练
    setImmediate(async () => {
      try {
        const metrics = await modelComparison.trainModel(modelType, trainingData);
        console.log(`${modelType} 模型训练完成:`, metrics);
      } catch (error) {
        console.error(`${modelType} 模型训练失败:`, error);
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '启动训练失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 训练所有模型
 */
router.post('/models/train-all', async (req: Request, res: Response) => {
  try {
    const samples = fileStorage.getAllSamples();
    if (samples.length < 8) {
      return res.status(400).json({
        success: false,
        message: '训练所有模型需要至少8个样本'
      });
    }

    const normalSamples = samples.filter(s => s.label === 'normal');
    const clickbaitSamples = samples.filter(s => s.label === 'clickbait');

    if (normalSamples.length < 3 || clickbaitSamples.length < 3) {
      return res.status(400).json({
        success: false,
        message: '每个类别至少需要3个样本'
      });
    }

    if (modelComparison.isAnyModelTraining()) {
      return res.status(400).json({
        success: false,
        message: '已有模型正在训练中，请稍后再试'
      });
    }

    // 转换数据格式
    const trainingData = samples.map(sample => ({
      text: sample.content,
      label: sample.label
    }));

    res.json({
      success: true,
      message: '开始训练所有模型',
      data: {
        trainingStarted: true,
        totalModels: 2
      }
    });

    // 异步训练所有模型
    setImmediate(async () => {
      try {
        console.log('开始训练所有模型，数据量:', trainingData.length);
        const results = await modelComparison.trainAllModels(trainingData);
        console.log('所有模型训练完成:', results);
      } catch (error) {
        console.error('训练所有模型失败:', error);
        if (error instanceof Error) {
          console.error('错误详情:', error.message);
          console.error('错误堆栈:', error.stack);
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '启动训练失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取训练状态和进度
 */
router.get('/training/status', (req: Request, res: Response) => {
  try {
    const trainingStatus = modelComparison.getTrainingStatus();
    const trainedModels = modelComparison.getTrainedModels();
    
    const progress: any = {};
    for (const modelType of Object.keys(trainingStatus) as ModelType[]) {
      const modelProgress = modelComparison.getTrainingProgress(modelType);
      if (modelProgress) {
        progress[modelType] = modelProgress;
      }
    }

    res.json({
      success: true,
      data: {
        trainingStatus,
        trainedModels,
        progress,
        isAnyTraining: modelComparison.isAnyModelTraining(),
        totalSamples: fileStorage.getAllSamples().length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取训练状态失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 对比预测所有模型
 */
router.post('/predict/compare', (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        message: '请提供要分析的文本内容'
      });
    }

    const trainedModels = modelComparison.getTrainedModels();
    if (trainedModels.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有已训练的模型，请先训练模型'
      });
    }

    const comparisonResults = modelComparison.getComparisonResults(text);
    const summary = modelComparison.getComparisonSummary(text);
    const explanations = modelComparison.getModelExplanations(text);

    res.json({
      success: true,
      data: {
        text,
        results: comparisonResults,
        summary,
        explanations
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '对比预测失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取模型对比摘要
 */
router.get('/summary', (req: Request, res: Response) => {
  try {
    const { text } = req.query;
    const summary = modelComparison.getComparisonSummary(text as string);
    const comparisonResults = modelComparison.getComparisonResults(text as string);
    
    res.json({
      success: true,
      data: {
        summary,
        results: comparisonResults
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取对比摘要失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取特征重要性对比
 */
router.get('/feature-importance', (req: Request, res: Response) => {
  try {
    const trainedModels = modelComparison.getTrainedModels();
    
    if (trainedModels.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有已训练的模型'
      });
    }

    const featureImportance: any = {};
    const { text } = req.query;
    
    if (text) {
      const explanations = modelComparison.getModelExplanations(text as string);
      for (const explanation of explanations) {
        if (explanation.featureImportance) {
          featureImportance[explanation.modelType] = explanation.featureImportance.slice(0, 10);
        }
      }
    }

    res.json({
      success: true,
      data: {
        featureImportance,
        trainedModels
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取特征重要性失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 交叉验证对比
 */
router.post('/cross-validation', async (req: Request, res: Response) => {
  try {
    const { folds = 5 } = req.body;
    
    const samples = fileStorage.getAllSamples();
    if (samples.length < 10) {
      return res.status(400).json({
        success: false,
        message: '交叉验证需要至少10个样本'
      });
    }

    const trainedModels = modelComparison.getTrainedModels();
    if (trainedModels.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有已训练的模型'
      });
    }

    res.json({
      success: true,
      message: '开始交叉验证',
      data: {
        folds,
        trainedModels: trainedModels.length
      }
    });

    // 转换数据格式
    const trainingData = samples.map(sample => ({
      text: sample.content,
      label: sample.label
    }));

    // 异步执行交叉验证
    setImmediate(async () => {
      try {
        const cvResults = await modelComparison.crossValidateAllModels(trainingData, folds);
        console.log('交叉验证完成:', cvResults);
      } catch (error) {
        console.error('交叉验证失败:', error);
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '启动交叉验证失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 重置所有模型
 */
router.post('/reset', (req: Request, res: Response) => {
  try {
    const { modelType } = req.body;
    
    if (modelType && ['random_forest', 'logistic_regression'].includes(modelType)) {
      modelComparison.resetModel(modelType as ModelType);
      res.json({
        success: true,
        message: `${modelType} 模型已重置`
      });
    } else {
      modelComparison.resetAllModels();
      res.json({
        success: true,
        message: '所有模型已重置'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '重置失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;