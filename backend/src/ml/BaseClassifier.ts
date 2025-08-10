import { TextFeatures } from './TextFeatureExtractor';

export interface TrainingData {
  text: string;
  label: 'normal' | 'clickbait';
}

export interface ClassificationResult {
  prediction: 'normal' | 'clickbait';
  confidence: number;
  features: TextFeatures;
  reasoning: string[];
  processingTime?: number;
}

export interface TrainingMetrics {
  // 训练集指标
  trainAccuracy: number;
  trainPrecision: number;
  trainRecall: number;
  trainF1Score: number;
  
  // 测试集指标
  testAccuracy: number;
  testPrecision: number;
  testRecall: number;
  testF1Score: number;
  
  // 通用指标（保持向后兼容）
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingTime: number;
  
  // 数据集信息
  datasetInfo: {
    totalSamples: number;
    trainSize: number;
    testSize: number;
    splitRatio: number;
    classDistribution: {
      normal: { train: number; test: number };
      clickbait: { train: number; test: number };
    };
  };
  
  // 模型性能差异（过拟合检测）
  overfit: {
    accuracyGap: number;  // 训练集 - 测试集准确率差异
    f1Gap: number;        // 训练集 - 测试集F1差异
    isOverfitting: boolean; // 是否存在过拟合
  };
  
  modelSize?: number;
}

export interface ModelInfo {
  name: string;
  type: 'traditional' | 'deep_learning' | 'rule_based';
  description: string;
  advantages: string[];
  disadvantages: string[];
  complexity: 'low' | 'medium' | 'high';
}

export interface TrainingProgress {
  stage: string;
  progress: number;
  message: string;
  timeElapsed: number;
}

export interface DatasetSplit {
  trainData: TrainingData[];
  testData: TrainingData[];
  splitInfo: {
    totalSamples: number;
    trainSize: number;
    testSize: number;
    splitRatio: number;
    classDistribution: {
      normal: { train: number; test: number };
      clickbait: { train: number; test: number };
    };
  };
}

export abstract class BaseClassifier {
  protected isTrained: boolean = false;
  protected trainingStartTime: number = 0;
  
  abstract getModelInfo(): ModelInfo;
  
  abstract train(
    trainingData: TrainingData[], 
    onProgress?: (progress: TrainingProgress) => void
  ): Promise<TrainingMetrics>;
  
  abstract predict(text: string): ClassificationResult;
  
  abstract isModelTrained(): boolean;
  
  abstract reset(): void;
  
  // 可选的特征重要性分析
  getFeatureImportance?(): { feature: string; importance: number }[];
  
  // 可选的模型解释
  explainPrediction?(text: string): { 
    prediction: ClassificationResult;
    explanation: string[];
    visualData?: any;
  };
  
  // 交叉验证评估 - 现在使用共享工具类
  async crossValidate(data: TrainingData[], folds: number = 5): Promise<TrainingMetrics[]> {
    const { ModelUtils } = await import('../utils/ModelUtils');
    return ModelUtils.performCrossValidation(
      () => {
        const tempClassifier = Object.create(Object.getPrototypeOf(this));
        Object.assign(tempClassifier, this);
        tempClassifier.reset();
        return tempClassifier;
      },
      data,
      folds
    );
  }
  
  // 分层随机分割数据集
  protected splitDataset(data: TrainingData[], testRatio: number = 0.2, randomSeed: number = 42): DatasetSplit {
    // 设置随机种子以确保结果可重复
    const seededRandom = (seed: number) => {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
    
    // 按标签分组
    const normalSamples = data.filter(d => d.label === 'normal');
    const clickbaitSamples = data.filter(d => d.label === 'clickbait');
    
    // 分别对每个类别进行随机分割
    const splitClass = (samples: TrainingData[], ratio: number, seed: number) => {
      const shuffled = [...samples].sort(() => seededRandom(seed++) - 0.5);
      const testSize = Math.floor(samples.length * ratio);
      const testData = shuffled.slice(0, testSize);
      const trainData = shuffled.slice(testSize);
      return { trainData, testData };
    };
    
    const normalSplit = splitClass(normalSamples, testRatio, randomSeed);
    const clickbaitSplit = splitClass(clickbaitSamples, testRatio, randomSeed + 100);
    
    // 合并分割结果
    const trainData = [...normalSplit.trainData, ...clickbaitSplit.trainData];
    const testData = [...normalSplit.testData, ...clickbaitSplit.testData];
    
    // 随机打乱训练集和测试集
    trainData.sort(() => seededRandom(randomSeed + 200) - 0.5);
    testData.sort(() => seededRandom(randomSeed + 300) - 0.5);
    
    return {
      trainData,
      testData,
      splitInfo: {
        totalSamples: data.length,
        trainSize: trainData.length,
        testSize: testData.length,
        splitRatio: testRatio,
        classDistribution: {
          normal: {
            train: normalSplit.trainData.length,
            test: normalSplit.testData.length
          },
          clickbait: {
            train: clickbaitSplit.trainData.length,
            test: clickbaitSplit.testData.length
          }
        }
      }
    };
  }
  
  // 在数据集上评估模型性能
  protected evaluateOnDataset(testData: TrainingData[]): { accuracy: number; precision: number; recall: number; f1Score: number } {
    if (testData.length === 0) {
      return { accuracy: 0, precision: 0, recall: 0, f1Score: 0 };
    }
    
    let tp = 0, fp = 0, tn = 0, fn = 0;
    
    for (const sample of testData) {
      try {
        const prediction = this.predict(sample.text);
        const predicted = prediction.prediction;
        const actual = sample.label;
        
        if (predicted === 'clickbait' && actual === 'clickbait') tp++;
        else if (predicted === 'clickbait' && actual === 'normal') fp++;
        else if (predicted === 'normal' && actual === 'normal') tn++;
        else if (predicted === 'normal' && actual === 'clickbait') fn++;
      } catch (error) {
        console.warn('预测失败，跳过样本:', error);
      }
    }
    
    const accuracy = (tp + tn) / (tp + fp + tn + fn);
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
    
    return { accuracy, precision, recall, f1Score };
  }
  
  // 检测过拟合
  protected detectOverfitting(trainMetrics: any, testMetrics: any): { accuracyGap: number; f1Gap: number; isOverfitting: boolean } {
    const accuracyGap = trainMetrics.accuracy - testMetrics.accuracy;
    const f1Gap = trainMetrics.f1Score - testMetrics.f1Score;
    
    // 如果训练集比测试集表现好太多，可能存在过拟合
    const isOverfitting = accuracyGap > 0.15 || f1Gap > 0.15;
    
    return { accuracyGap, f1Gap, isOverfitting };
  }
  
  // 在数据集上评估模型 - 保留此方法供向后兼容
  protected evaluateOnData(classifier: BaseClassifier, testData: TrainingData[]): TrainingMetrics {
    const { ModelUtils } = require('../utils/ModelUtils');
    return ModelUtils.evaluateOnData(classifier, testData);
  }
}