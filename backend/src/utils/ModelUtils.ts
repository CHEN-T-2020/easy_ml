import { TrainingData, TrainingMetrics, BaseClassifier } from '../ml/BaseClassifier';

export class ModelUtils {
  /**
   * 数据集分割工具 - 用于验证
   */
  static splitDataset(
    data: TrainingData[], 
    trainRatio: number = 0.8
  ): { trainData: TrainingData[]; validationData: TrainingData[] } {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const splitIndex = Math.floor(data.length * trainRatio);
    
    return {
      trainData: shuffled.slice(0, splitIndex),
      validationData: shuffled.slice(splitIndex)
    };
  }

  /**
   * 获取验证指标的通用方法
   */
  static async getValidationMetrics(
    classifier: BaseClassifier,
    data: TrainingData[],
    penaltyFactor: number = 0.85
  ): Promise<TrainingMetrics> {
    const { validationData } = ModelUtils.splitDataset(data);
    
    if (validationData.length === 0) {
      // 如果验证数据不足，返回训练集上的结果（但应用惩罚因子）
      const metrics = ModelUtils.evaluateOnData(classifier, data);
      return {
        ...metrics,
        accuracy: metrics.accuracy * penaltyFactor,
        precision: metrics.precision * penaltyFactor,
        recall: metrics.recall * penaltyFactor,
        f1Score: metrics.f1Score * penaltyFactor
      };
    }
    
    return ModelUtils.evaluateOnData(classifier, validationData);
  }

  /**
   * 在指定数据集上评估模型性能
   */
  static evaluateOnData(classifier: BaseClassifier, testData: TrainingData[]): TrainingMetrics {
    const startTime = Date.now();
    let correct = 0;
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    
    for (const sample of testData) {
      const result = classifier.predict(sample.text);
      const predicted = result.prediction;
      const actual = sample.label;
      
      if (predicted === actual) {
        correct++;
      }
      
      if (predicted === 'clickbait' && actual === 'clickbait') {
        truePositives++;
      } else if (predicted === 'clickbait' && actual === 'normal') {
        falsePositives++;
      } else if (predicted === 'normal' && actual === 'clickbait') {
        falseNegatives++;
      }
    }
    
    const accuracy = correct / testData.length;
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    const trainingTime = Date.now() - startTime;
    
    return {
      // 使用测试集指标作为主指标（向后兼容）
      accuracy,
      precision,
      recall,
      f1Score,
      trainingTime,
      // 由于这是验证方法，设置训练集和测试集指标相同
      trainAccuracy: accuracy,
      trainPrecision: precision,
      trainRecall: recall,
      trainF1Score: f1Score,
      testAccuracy: accuracy,
      testPrecision: precision,
      testRecall: recall,
      testF1Score: f1Score,
      // 默认数据集信息
      datasetInfo: {
        totalSamples: testData.length,
        trainSize: Math.floor(testData.length * 0.8),
        testSize: Math.floor(testData.length * 0.2),
        splitRatio: 0.2,
        classDistribution: {
          normal: { 
            train: Math.floor(testData.filter((d: any) => d.label === 'normal').length * 0.8),
            test: Math.floor(testData.filter((d: any) => d.label === 'normal').length * 0.2)
          },
          clickbait: { 
            train: Math.floor(testData.filter((d: any) => d.label === 'clickbait').length * 0.8),
            test: Math.floor(testData.filter((d: any) => d.label === 'clickbait').length * 0.2)
          }
        }
      },
      // 默认过拟合信息
      overfit: {
        accuracyGap: 0,
        f1Gap: 0,
        isOverfitting: false
      }
    };
  }

  /**
   * 交叉验证的通用实现
   */
  static async performCrossValidation(
    createClassifierInstance: () => BaseClassifier,
    data: TrainingData[], 
    folds: number = 5
  ): Promise<TrainingMetrics[]> {
    const foldSize = Math.floor(data.length / folds);
    const results: TrainingMetrics[] = [];
    
    for (let i = 0; i < folds; i++) {
      const testStart = i * foldSize;
      const testEnd = i === folds - 1 ? data.length : (i + 1) * foldSize;
      
      const testData = data.slice(testStart, testEnd);
      const trainData = [...data.slice(0, testStart), ...data.slice(testEnd)];
      
      // 创建新的分类器实例
      const tempClassifier = createClassifierInstance();
      await tempClassifier.train(trainData);
      
      // 在测试集上评估
      const testMetrics = ModelUtils.evaluateOnData(tempClassifier, testData);
      results.push(testMetrics);
    }
    
    return results;
  }

  /**
   * 数据验证工具
   */
  static validateTrainingData(data: TrainingData[], minSamplesPerClass: number = 2): {
    isValid: boolean;
    error?: string;
    normalCount: number;
    clickbaitCount: number;
  } {
    if (data.length < minSamplesPerClass * 2) {
      return {
        isValid: false,
        error: `训练数据不足，至少需要${minSamplesPerClass * 2}个样本`,
        normalCount: 0,
        clickbaitCount: 0
      };
    }

    const normalData = data.filter(d => d.label === 'normal');
    const clickbaitData = data.filter(d => d.label === 'clickbait');

    if (normalData.length < minSamplesPerClass || clickbaitData.length < minSamplesPerClass) {
      return {
        isValid: false,
        error: `每个类别至少需要${minSamplesPerClass}个样本`,
        normalCount: normalData.length,
        clickbaitCount: clickbaitData.length
      };
    }

    return {
      isValid: true,
      normalCount: normalData.length,
      clickbaitCount: clickbaitData.length
    };
  }
}