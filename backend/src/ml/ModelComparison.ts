import { 
  BaseClassifier, 
  TrainingData, 
  ClassificationResult, 
  TrainingMetrics, 
  ModelInfo 
} from './BaseClassifier';
import { ClickbaitClassifier } from './ClickbaitClassifier';
import { RandomForestClassifier } from './RandomForestClassifier';
import { CNNTextClassifier } from './CNNTextClassifier';

export type ModelType = 'naive_bayes' | 'random_forest' | 'cnn';

export interface ModelComparisonResult {
  modelType: ModelType;
  modelInfo: ModelInfo;
  metrics: TrainingMetrics;
  prediction: ClassificationResult;
  isCurrentlyTraining: boolean;
  trainingProgress?: {
    stage: string;
    progress: number;
    message: string;
    timeElapsed: number;
  };
}

export interface ComparisonSummary {
  totalModels: number;
  trainedModels: number;
  bestAccuracy: {
    modelType: ModelType;
    accuracy: number;
  };
  fastestTraining: {
    modelType: ModelType;
    trainingTime: number;
  };
  fastestPrediction: {
    modelType: ModelType;
    processingTime: number;
  };
  consensusPrediction?: {
    prediction: 'normal' | 'clickbait';
    confidence: number;
    agreement: number; // 一致性百分比
  };
}

export interface ModelExplanation {
  modelType: ModelType;
  prediction: ClassificationResult;
  explanation: string[];
  visualData?: any;
  featureImportance?: { feature: string; importance: number }[];
}

export class ModelComparison {
  private models: Map<ModelType, BaseClassifier> = new Map();
  private trainingProgress: Map<ModelType, any> = new Map();
  private metrics: Map<ModelType, TrainingMetrics> = new Map();
  private isTraining: Map<ModelType, boolean> = new Map();

  constructor() {
    this.initializeModels();
  }

  private initializeModels(): void {
    this.models.set('naive_bayes', new ClickbaitClassifier());
    this.models.set('random_forest', new RandomForestClassifier());
    this.models.set('cnn', new CNNTextClassifier());

    // 初始化训练状态
    for (const modelType of this.models.keys()) {
      this.isTraining.set(modelType, false);
      this.trainingProgress.set(modelType, null);
    }
  }

  /**
   * 获取所有模型信息
   */
  getAllModelsInfo(): { [key in ModelType]: ModelInfo } {
    const info: { [key in ModelType]: ModelInfo } = {} as any;
    
    for (const [modelType, model] of this.models) {
      info[modelType] = model.getModelInfo();
    }
    
    return info;
  }

  /**
   * 训练单个模型
   */
  async trainModel(
    modelType: ModelType, 
    trainingData: TrainingData[]
  ): Promise<TrainingMetrics> {
    const model = this.models.get(modelType);
    if (!model) {
      throw new Error(`未知的模型类型: ${modelType}`);
    }

    if (this.isTraining.get(modelType)) {
      throw new Error(`模型 ${modelType} 正在训练中`);
    }

    this.isTraining.set(modelType, true);
    
    try {
      const metrics = await model.train(trainingData, (progress) => {
        this.trainingProgress.set(modelType, progress);
      });
      
      this.metrics.set(modelType, metrics);
      this.isTraining.set(modelType, false);
      this.trainingProgress.set(modelType, null);
      
      return metrics;
    } catch (error) {
      this.isTraining.set(modelType, false);
      this.trainingProgress.set(modelType, null);
      throw error;
    }
  }

  /**
   * 训练所有模型
   */
  async trainAllModels(trainingData: TrainingData[]): Promise<Map<ModelType, TrainingMetrics>> {
    const results = new Map<ModelType, TrainingMetrics>();
    
    // 按复杂度顺序训练：朴素贝叶斯 -> 随机森林 -> CNN
    const modelOrder: ModelType[] = ['naive_bayes', 'random_forest', 'cnn'];
    
    for (const modelType of modelOrder) {
      try {
        console.log(`开始训练 ${modelType} 模型...`);
        
        // 为每个模型设置单独的超时
        const modelTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`${modelType} 模型训练超时`));
          }, modelType === 'cnn' ? 40000 : 10000); // CNN给更多时间
        });
        
        const trainingPromise = this.trainModel(modelType, trainingData);
        
        // 使用 Promise.race 来实现超时
        const metrics = await Promise.race([trainingPromise, modelTimeout]);
        
        results.set(modelType, metrics);
        console.log(`${modelType} 模型训练完成，准确率: ${(metrics.accuracy * 100).toFixed(2)}%`);
      } catch (error) {
        console.error(`训练 ${modelType} 模型失败:`, error);
        
        // 为失败的模型设置默认指标
        results.set(modelType, {
          accuracy: 0.5,
          precision: 0.5,
          recall: 0.5,
          f1Score: 0.5,
          trainingTime: 0
        });
        
        // 继续训练其他模型
      }
    }
    
    console.log(`训练完成，成功训练了 ${results.size} 个模型`);
    return results;
  }

  /**
   * 使用所有已训练模型进行预测
   */
  predictWithAllModels(text: string): Map<ModelType, ClassificationResult> {
    const predictions = new Map<ModelType, ClassificationResult>();
    
    for (const [modelType, model] of this.models) {
      if (model.isModelTrained()) {
        try {
          const prediction = model.predict(text);
          predictions.set(modelType, prediction);
        } catch (error) {
          console.error(`模型 ${modelType} 预测失败:`, error);
        }
      }
    }
    
    return predictions;
  }

  /**
   * 获取模型对比结果
   */
  getComparisonResults(text?: string): ModelComparisonResult[] {
    const results: ModelComparisonResult[] = [];
    
    for (const [modelType, model] of this.models) {
      const modelInfo = model.getModelInfo();
      const metrics = this.metrics.get(modelType);
      const isCurrentlyTraining = this.isTraining.get(modelType) || false;
      const trainingProgress = this.trainingProgress.get(modelType);
      
      let prediction: ClassificationResult | undefined;
      if (text && model.isModelTrained()) {
        try {
          prediction = model.predict(text);
        } catch (error) {
          console.error(`模型 ${modelType} 预测失败:`, error);
        }
      }
      
      results.push({
        modelType,
        modelInfo,
        metrics: metrics || {
          accuracy: 0,
          precision: 0,
          recall: 0,
          f1Score: 0,
          trainingTime: 0
        },
        prediction: prediction || {
          prediction: 'normal',
          confidence: 0,
          features: {} as any,
          reasoning: ['模型未训练'],
          processingTime: 0
        },
        isCurrentlyTraining,
        trainingProgress
      });
    }
    
    return results;
  }

  /**
   * 获取对比摘要
   */
  getComparisonSummary(text?: string): ComparisonSummary {
    const trainedModels = Array.from(this.models.entries())
      .filter(([_, model]) => model.isModelTrained());
    
    const allMetrics = Array.from(this.metrics.entries());
    
    // 找出最佳准确率
    let bestAccuracy = { modelType: 'naive_bayes' as ModelType, accuracy: 0 };
    for (const [modelType, metrics] of allMetrics) {
      if (metrics.accuracy > bestAccuracy.accuracy) {
        bestAccuracy = { modelType, accuracy: metrics.accuracy };
      }
    }
    
    // 找出最快训练时间
    let fastestTraining = { modelType: 'naive_bayes' as ModelType, trainingTime: Infinity };
    for (const [modelType, metrics] of allMetrics) {
      if (metrics.trainingTime < fastestTraining.trainingTime) {
        fastestTraining = { modelType, trainingTime: metrics.trainingTime };
      }
    }
    
    // 找出最快预测时间
    let fastestPrediction = { modelType: 'naive_bayes' as ModelType, processingTime: Infinity };
    if (text) {
      const predictions = this.predictWithAllModels(text);
      for (const [modelType, prediction] of predictions) {
        if (prediction.processingTime && prediction.processingTime < fastestPrediction.processingTime) {
          fastestPrediction = { modelType, processingTime: prediction.processingTime };
        }
      }
    }
    
    // 计算共识预测
    let consensusPrediction: ComparisonSummary['consensusPrediction'];
    if (text && trainedModels.length > 1) {
      const predictions = this.predictWithAllModels(text);
      const predictionCounts = { normal: 0, clickbait: 0 };
      let totalConfidence = 0;
      
      for (const [_, prediction] of predictions) {
        predictionCounts[prediction.prediction]++;
        totalConfidence += prediction.confidence;
      }
      
      const totalPredictions = predictions.size;
      const majorityPrediction = predictionCounts.clickbait > predictionCounts.normal ? 'clickbait' : 'normal';
      const agreement = Math.max(predictionCounts.clickbait, predictionCounts.normal) / totalPredictions;
      
      consensusPrediction = {
        prediction: majorityPrediction,
        confidence: Math.round(totalConfidence / totalPredictions),
        agreement: Math.round(agreement * 100)
      };
    }
    
    return {
      totalModels: this.models.size,
      trainedModels: trainedModels.length,
      bestAccuracy,
      fastestTraining,
      fastestPrediction,
      consensusPrediction
    };
  }

  /**
   * 获取详细解释
   */
  getModelExplanations(text: string): ModelExplanation[] {
    const explanations: ModelExplanation[] = [];
    
    for (const [modelType, model] of this.models) {
      if (model.isModelTrained()) {
        try {
          const prediction = model.predict(text);
          
          let explanation: string[] = [];
          let visualData: any = null;
          let featureImportance: { feature: string; importance: number }[] | undefined;
          
          // 获取模型特定的解释
          if (model.explainPrediction) {
            const detailed = model.explainPrediction(text);
            explanation = detailed.explanation;
            visualData = detailed.visualData;
          } else {
            explanation = [
              `${model.getModelInfo().name}的基本预测`,
              `置信度: ${prediction.confidence}%`,
              `处理时间: ${prediction.processingTime}ms`
            ];
          }
          
          // 获取特征重要性
          if (model.getFeatureImportance) {
            featureImportance = model.getFeatureImportance();
          }
          
          explanations.push({
            modelType,
            prediction,
            explanation,
            visualData,
            featureImportance
          });
          
        } catch (error) {
          console.error(`获取模型 ${modelType} 解释失败:`, error);
        }
      }
    }
    
    return explanations;
  }

  /**
   * 交叉验证对比
   */
  async crossValidateAllModels(
    data: TrainingData[], 
    folds: number = 5
  ): Promise<Map<ModelType, TrainingMetrics[]>> {
    const results = new Map<ModelType, TrainingMetrics[]>();
    
    for (const [modelType, model] of this.models) {
      if (model.isModelTrained()) {
        try {
          console.log(`开始 ${modelType} 模型的${folds}折交叉验证...`);
          const cvResults = await model.crossValidate(data, folds);
          results.set(modelType, cvResults);
          
          const avgAccuracy = cvResults.reduce((sum, r) => sum + r.accuracy, 0) / cvResults.length;
          console.log(`${modelType} 平均准确率: ${(avgAccuracy * 100).toFixed(2)}%`);
        } catch (error) {
          console.error(`${modelType} 交叉验证失败:`, error);
        }
      }
    }
    
    return results;
  }

  /**
   * 重置所有模型
   */
  resetAllModels(): void {
    for (const [modelType, model] of this.models) {
      model.reset();
      this.isTraining.set(modelType, false);
      this.trainingProgress.set(modelType, null);
    }
    this.metrics.clear();
  }

  /**
   * 重置单个模型
   */
  resetModel(modelType: ModelType): void {
    const model = this.models.get(modelType);
    if (model) {
      model.reset();
      this.isTraining.set(modelType, false);
      this.trainingProgress.set(modelType, null);
      this.metrics.delete(modelType);
    }
  }

  /**
   * 获取模型训练状态
   */
  getTrainingStatus(): { [key in ModelType]: boolean } {
    const status: { [key in ModelType]: boolean } = {} as any;
    
    for (const [modelType, isTraining] of this.isTraining) {
      status[modelType] = isTraining || false;
    }
    
    return status;
  }

  /**
   * 获取模型训练进度
   */
  getTrainingProgress(modelType: ModelType): any {
    return this.trainingProgress.get(modelType);
  }

  /**
   * 检查是否有模型正在训练
   */
  isAnyModelTraining(): boolean {
    return Array.from(this.isTraining.values()).some(training => training);
  }

  /**
   * 获取已训练的模型列表
   */
  getTrainedModels(): ModelType[] {
    const trainedModels: ModelType[] = [];
    
    for (const [modelType, model] of this.models) {
      if (model.isModelTrained()) {
        trainedModels.push(modelType);
      }
    }
    
    return trainedModels;
  }
}