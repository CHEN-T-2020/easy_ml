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
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingTime: number;
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
  
  // 在数据集上评估模型 - 保留此方法供向后兼容
  protected evaluateOnData(classifier: BaseClassifier, testData: TrainingData[]): TrainingMetrics {
    const { ModelUtils } = require('../utils/ModelUtils');
    return ModelUtils.evaluateOnData(classifier, testData);
  }
}