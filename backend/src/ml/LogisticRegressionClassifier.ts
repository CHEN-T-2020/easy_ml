import { 
  BaseClassifier, 
  TrainingData, 
  ClassificationResult, 
  TrainingMetrics, 
  ModelInfo,
  TrainingProgress 
} from './BaseClassifier';
import { TextFeatureExtractor, TextFeatures } from './TextFeatureExtractor';

interface LogisticRegressionModel {
  weights: number[];
  bias: number;
  featureNames: string[];
  vocabulary: Map<string, number>;
}

export class LogisticRegressionClassifier extends BaseClassifier {
  private featureExtractor: TextFeatureExtractor;
  private model: LogisticRegressionModel | null = null;
  private readonly learningRate = 0.01;
  private readonly maxIterations = 1000;
  private readonly convergenceThreshold = 1e-6;

  constructor() {
    super();
    this.featureExtractor = new TextFeatureExtractor();
  }

  getModelInfo(): ModelInfo {
    return {
      name: '逻辑回归分类器',
      type: 'statistical',
      description: '基于逻辑回归的线性分类模型，使用文本特征进行分类',
      advantages: [
        '训练速度快',
        '模型可解释性强',
        '内存占用小',
        '不易过拟合',
        '支持概率输出'
      ],
      disadvantages: [
        '只能学习线性关系',
        '对特征工程要求高',
        '可能欠拟合复杂数据',
        '对异常值敏感',
        '假设特征独立'
      ],
      complexity: 'low'
    };
  }

  async train(
    trainingData: TrainingData[], 
    onProgress?: (progress: TrainingProgress) => void
  ): Promise<TrainingMetrics> {
    this.trainingStartTime = Date.now();
    
    if (trainingData.length < 2) {
      throw new Error('逻辑回归模型需要至少2个训练样本');
    }

    const normalData = trainingData.filter(d => d.label === 'normal');
    const clickbaitData = trainingData.filter(d => d.label === 'clickbait');

    if (normalData.length === 0 || clickbaitData.length === 0) {
      throw new Error('每个类别至少需要1个样本');
    }

    // 1. 特征提取
    onProgress?.({
      stage: 'feature_extraction',
      progress: 20,
      message: '正在提取文本特征...',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    const features = this.extractAllFeatures(trainingData);
    const labels = trainingData.map(d => d.label === 'clickbait' ? 1 : 0);

    // 2. 特征标准化
    onProgress?.({
      stage: 'normalization',
      progress: 40,
      message: '正在标准化特征...',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    const normalizedFeatures = this.normalizeFeatures(features);

    // 3. 初始化模型参数
    onProgress?.({
      stage: 'initialization',
      progress: 50,
      message: '正在初始化模型参数...',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    this.initializeModel(normalizedFeatures[0].length);

    // 4. 训练模型
    onProgress?.({
      stage: 'training',
      progress: 60,
      message: '正在训练逻辑回归模型...',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    await this.trainModel(normalizedFeatures, labels, onProgress);

    this.isTrained = true;
    
    // 5. 评估模型
    onProgress?.({
      stage: 'evaluation',
      progress: 90,
      message: '正在评估模型性能...',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    const metrics = await this.getValidationMetrics(trainingData);
    metrics.trainingTime = Date.now() - this.trainingStartTime;

    onProgress?.({
      stage: 'completed',
      progress: 100,
      message: '逻辑回归模型训练完成',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    return metrics;
  }

  predict(text: string): ClassificationResult {
    if (!this.isTrained || !this.model) {
      throw new Error('模型尚未训练，请先调用train()方法');
    }

    const startTime = performance.now();
    const textFeatures = this.featureExtractor.extractFeatures(text);
    
    // 提取完整特征向量
    const featureVector = this.extractFeatureVector(text, textFeatures);
    const normalizedFeatures = this.normalizeFeatureVector(featureVector);
    
    // 计算预测概率
    const probability = this.predictProbability(normalizedFeatures);
    const label = probability > 0.5 ? 'clickbait' : 'normal';
    
    // 计算置信度
    const confidence = Math.abs(probability - 0.5) * 2;

    // 生成解释
    const reasoning = this.generateReasoning(text, textFeatures, probability);
    const processingTime = Math.max(0.1, Math.round((performance.now() - startTime) * 100) / 100);

    return {
      prediction: label,
      confidence: Math.round(confidence * 100),
      features: textFeatures,
      reasoning,
      processingTime
    };
  }

  isModelTrained(): boolean {
    return this.isTrained;
  }

  reset(): void {
    this.isTrained = false;
    this.model = null;
  }

  explainPrediction(text: string): {
    prediction: ClassificationResult;
    explanation: string[];
    visualData: any;
  } {
    const prediction = this.predict(text);
    
    const explanation = [
      `使用逻辑回归算法进行分类`,
      `学习率: ${this.learningRate}`,
      `最大迭代次数: ${this.maxIterations}`,
      `预测耗时: ${prediction.processingTime}ms`
    ];

    if (this.model) {
      const featureVector = this.extractFeatureVector(text, prediction.features);
      const featureImportances = this.getFeatureImportances(featureVector);
      
      return {
        prediction,
        explanation,
        visualData: {
          weights: this.model.weights,
          bias: this.model.bias,
          featureImportances,
          featureNames: this.model.featureNames
        }
      };
    }

    return {
      prediction,
      explanation,
      visualData: null
    };
  }

  getFeatureImportance(): { feature: string; importance: number }[] {
    if (!this.model) {
      return [];
    }

    return this.model.featureNames.map((name, index) => ({
      feature: name,
      importance: Math.abs(this.model!.weights[index])
    })).sort((a, b) => b.importance - a.importance);
  }

  // 提取所有样本的特征
  private extractAllFeatures(trainingData: TrainingData[]): number[][] {
    const features: number[][] = [];
    
    for (const sample of trainingData) {
      const textFeatures = this.featureExtractor.extractFeatures(sample.text);
      const featureVector = this.extractFeatureVector(sample.text, textFeatures);
      features.push(featureVector);
    }
    
    return features;
  }

  // 从文本提取特征向量
  private extractFeatureVector(text: string, textFeatures: TextFeatures): number[] {
    const features: number[] = [];
    
    // 基础文本特征
    features.push(
      text.length,
      textFeatures.wordCount,
      textFeatures.sentenceCount,
      textFeatures.avgWordsPerSentence,
      textFeatures.exclamationCount,
      textFeatures.questionCount,
      textFeatures.capitalRatio,
      textFeatures.digitRatio,
      textFeatures.punctuationRatio,
      textFeatures.clickbaitWords,
      textFeatures.emotionalWords,
      textFeatures.superlativeCount
    );

    // 词频特征 (简化版TF-IDF)
    const words = this.tokenize(text);
    const uniqueWords = new Set(words);
    const wordFreq = uniqueWords.size / words.length;
    features.push(wordFreq);

    // 字符级特征
    const chineseCharRatio = (text.match(/[\u4e00-\u9fa5]/g) || []).length / text.length;
    const specialCharRatio = (text.match(/[！？…【】《》""'']/g) || []).length / text.length;
    features.push(chineseCharRatio, specialCharRatio);

    return features;
  }

  // 简单分词
  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  // 特征标准化
  private normalizeFeatures(features: number[][]): number[][] {
    if (features.length === 0) return features;
    
    const numFeatures = features[0].length;
    const means: number[] = [];
    const stds: number[] = [];
    
    // 计算均值和标准差
    for (let j = 0; j < numFeatures; j++) {
      const values = features.map(f => f[j]);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance) || 1; // 避免除零
      
      means.push(mean);
      stds.push(std);
    }
    
    // 存储标准化参数
    if (!this.model) {
      this.model = {
        weights: [],
        bias: 0,
        featureNames: this.getFeatureNames(),
        vocabulary: new Map()
      };
    }
    
    (this.model as any).means = means;
    (this.model as any).stds = stds;
    
    // 标准化特征
    return features.map(featureVector => 
      featureVector.map((value, index) => 
        (value - means[index]) / stds[index]
      )
    );
  }

  // 标准化单个特征向量
  private normalizeFeatureVector(featureVector: number[]): number[] {
    if (!this.model || !(this.model as any).means || !(this.model as any).stds) {
      return featureVector;
    }
    
    const means = (this.model as any).means;
    const stds = (this.model as any).stds;
    
    return featureVector.map((value, index) => 
      (value - means[index]) / stds[index]
    );
  }

  // 获取特征名称
  private getFeatureNames(): string[] {
    return [
      'text_length', 'word_count', 'sentence_count', 'avg_words_per_sentence',
      'exclamation_count', 'question_count', 'capital_ratio', 'digit_ratio',
      'punctuation_ratio', 'clickbait_words', 'emotional_words', 'superlative_count',
      'word_frequency', 'chinese_char_ratio', 'special_char_ratio'
    ];
  }

  // 初始化模型参数
  private initializeModel(featureCount: number): void {
    const weights = new Array(featureCount).fill(0).map(() => (Math.random() - 0.5) * 0.01);
    const bias = 0;
    
    this.model = {
      weights,
      bias,
      featureNames: this.getFeatureNames(),
      vocabulary: new Map()
    };
  }

  // 训练模型
  private async trainModel(
    features: number[][], 
    labels: number[], 
    onProgress?: (progress: TrainingProgress) => void
  ): Promise<void> {
    if (!this.model) {
      throw new Error('模型未初始化');
    }

    let prevLoss = Infinity;
    
    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      let totalLoss = 0;
      const gradWeights = new Array(this.model.weights.length).fill(0);
      let gradBias = 0;
      
      // 前向传播和反向传播
      for (let i = 0; i < features.length; i++) {
        const featureVector = features[i];
        const label = labels[i];
        
        // 预测
        const prediction = this.predictProbability(featureVector);
        
        // 计算损失
        const loss = -(label * Math.log(Math.max(prediction, 1e-15)) + 
                       (1 - label) * Math.log(Math.max(1 - prediction, 1e-15)));
        totalLoss += loss;
        
        // 计算梯度
        const error = prediction - label;
        
        for (let j = 0; j < featureVector.length; j++) {
          gradWeights[j] += error * featureVector[j];
        }
        gradBias += error;
      }
      
      // 更新参数
      const numSamples = features.length;
      for (let j = 0; j < this.model.weights.length; j++) {
        this.model.weights[j] -= this.learningRate * (gradWeights[j] / numSamples);
      }
      this.model.bias -= this.learningRate * (gradBias / numSamples);
      
      const avgLoss = totalLoss / numSamples;
      
      // 检查收敛
      if (Math.abs(prevLoss - avgLoss) < this.convergenceThreshold) {
        console.log(`逻辑回归在第${iteration + 1}轮收敛，损失: ${avgLoss.toFixed(6)}`);
        break;
      }
      prevLoss = avgLoss;
      
      // 报告进度
      if (iteration % 100 === 0) {
        const progress = 60 + (iteration / this.maxIterations) * 30;
        onProgress?.({
          stage: 'training',
          progress,
          message: `训练轮次 ${iteration + 1}/${this.maxIterations}, 损失: ${avgLoss.toFixed(6)}`,
          timeElapsed: Date.now() - this.trainingStartTime
        });
      }
      
      // 异步让步
      if (iteration % 50 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  }

  // 预测概率
  private predictProbability(features: number[]): number {
    if (!this.model) {
      throw new Error('模型未初始化');
    }

    let logit = this.model.bias;
    
    for (let i = 0; i < features.length && i < this.model.weights.length; i++) {
      logit += this.model.weights[i] * features[i];
    }
    
    // Sigmoid函数
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, logit))));
  }

  // 获取特征重要性
  private getFeatureImportances(featureVector: number[]): { feature: string; importance: number }[] {
    if (!this.model) return [];
    
    return this.model.featureNames.map((name, index) => ({
      feature: name,
      importance: Math.abs(this.model!.weights[index] * (featureVector[index] || 0))
    })).sort((a, b) => b.importance - a.importance);
  }

  // 生成预测解释
  private generateReasoning(
    text: string, 
    features: TextFeatures, 
    probability: number
  ): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`逻辑回归预测概率: ${(probability * 100).toFixed(1)}%`);
    
    if (probability > 0.7) {
      reasoning.push('模型认为这是标题党的可能性很高');
    } else if (probability > 0.5) {
      reasoning.push('模型倾向于认为这是标题党');
    } else if (probability < 0.3) {
      reasoning.push('模型认为这不是标题党');
    } else {
      reasoning.push('模型预测结果不确定');
    }
    
    // 基于重要特征的解释
    if (features.exclamationCount > 1) {
      reasoning.push(`包含多个感叹号(${features.exclamationCount}个)增加了标题党可能性`);
    }
    
    if (features.clickbaitWords > 0) {
      reasoning.push(`包含${features.clickbaitWords}个标题党关键词`);
    }
    
    if (features.capitalRatio > 0.3) {
      reasoning.push(`大写字母比例较高(${(features.capitalRatio * 100).toFixed(1)}%)`);
    }
    
    if (features.superlativeCount > 0) {
      reasoning.push(`包含${features.superlativeCount}个极端词汇`);
    }
    
    return reasoning;
  }

  /**
   * 获取验证指标
   */
  private async getValidationMetrics(data: TrainingData[]): Promise<TrainingMetrics> {
    const { ModelUtils } = await import('../utils/ModelUtils');
    return ModelUtils.getValidationMetrics(this, data, 0.75);
  }
}