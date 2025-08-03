import { TextFeatures } from './TextFeatureExtractor';

export interface TrainingData {
  text: string;
  label: 'real' | 'fake';
}

export interface ClassificationResult {
  prediction: 'real' | 'fake';
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
  
  // 交叉验证评估
  async crossValidate(data: TrainingData[], folds: number = 5): Promise<TrainingMetrics[]> {
    const foldSize = Math.floor(data.length / folds);
    const results: TrainingMetrics[] = [];
    
    for (let i = 0; i < folds; i++) {
      const testStart = i * foldSize;
      const testEnd = i === folds - 1 ? data.length : (i + 1) * foldSize;
      
      const testData = data.slice(testStart, testEnd);
      const trainData = [...data.slice(0, testStart), ...data.slice(testEnd)];
      
      // 训练临时模型
      const tempClassifier = Object.create(Object.getPrototypeOf(this));
      Object.assign(tempClassifier, this);
      tempClassifier.reset();
      
      const metrics = await tempClassifier.train(trainData);
      
      // 在测试集上评估
      const testMetrics = this.evaluateOnData(tempClassifier, testData);
      results.push(testMetrics);
    }
    
    return results;
  }
  
  // 在数据集上评估模型
  protected evaluateOnData(classifier: BaseClassifier, testData: TrainingData[]): TrainingMetrics {
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
      
      if (predicted === 'fake' && actual === 'fake') {
        truePositives++;
      } else if (predicted === 'fake' && actual === 'real') {
        falsePositives++;
      } else if (predicted === 'real' && actual === 'fake') {
        falseNegatives++;
      }
    }
    
    const accuracy = correct / testData.length;
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    const trainingTime = Date.now() - startTime;
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      trainingTime
    };
  }
}