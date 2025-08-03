import { TextFeatureExtractor, TextFeatures } from './TextFeatureExtractor';
import { 
  BaseClassifier, 
  TrainingData, 
  ClassificationResult, 
  TrainingMetrics, 
  ModelInfo,
  TrainingProgress 
} from './BaseClassifier';

export class ClickbaitClassifier extends BaseClassifier {
  private featureExtractor: TextFeatureExtractor;
  
  // 朴素贝叶斯参数
  private realMeans: number[] = [];
  private realStds: number[] = [];
  private fakeMeans: number[] = [];
  private fakeStds: number[] = [];
  private realPrior: number = 0.5;
  private fakePrior: number = 0.5;
  
  // 特征权重（用于解释）
  private featureNames: string[] = [
    '文本长度', '词汇数量', '句子数量', '感叹号数量', '问号数量',
    '大写比例', '标题党词汇', '紧迫性词汇', '情感词汇', 
    '平均词长', '标点比例', ...Array.from({length: 20}, (_, i) => `TF-IDF特征${i+1}`)
  ];

  constructor() {
    super();
    this.featureExtractor = new TextFeatureExtractor();
  }

  getModelInfo(): ModelInfo {
    return {
      name: '朴素贝叶斯分类器',
      type: 'traditional',
      description: '基于贝叶斯定理的概率分类方法，假设特征间相互独立',
      advantages: [
        '训练速度快，实现简单',
        '对小数据集表现良好',
        '具有较好的可解释性',
        '对噪声数据不敏感',
        '支持增量学习'
      ],
      disadvantages: [
        '假设特征独立，现实中往往不成立',
        '对特征缺失敏感',
        '分类性能有限',
        '需要平滑处理零概率'
      ],
      complexity: 'low'
    };
  }

  /**
   * 训练分类器
   */
  async train(
    trainingData: TrainingData[], 
    onProgress?: (progress: TrainingProgress) => void
  ): Promise<TrainingMetrics> {
    this.trainingStartTime = Date.now();
    if (trainingData.length < 4) {
      throw new Error('训练数据不足，至少需要4个样本（每类至少2个）');
    }

    // 分离真实和标题党数据
    const realData = trainingData.filter(d => d.label === 'real');
    const fakeData = trainingData.filter(d => d.label === 'fake');

    if (realData.length === 0 || fakeData.length === 0) {
      throw new Error('需要同时包含正常标题和标题党样本');
    }

    // 训练TF-IDF
    onProgress?.({
      stage: 'feature_extraction',
      progress: 20,
      message: '正在提取文本特征...',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    const allTexts = trainingData.map(d => d.text);
    this.featureExtractor.trainTfIdf(allTexts);

    // 提取特征
    onProgress?.({
      stage: 'training_model',
      progress: 60,
      message: '正在训练朴素贝叶斯模型...',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    const realFeatures = realData.map(d => 
      this.featureExtractor.getFeatureVector(
        this.featureExtractor.extractFeatures(d.text)
      )
    );
    const fakeFeatures = fakeData.map(d => 
      this.featureExtractor.getFeatureVector(
        this.featureExtractor.extractFeatures(d.text)
      )
    );

    // 计算统计量
    this.realMeans = this.calculateMeans(realFeatures);
    this.realStds = this.calculateStds(realFeatures, this.realMeans);
    this.fakeMeans = this.calculateMeans(fakeFeatures);
    this.fakeStds = this.calculateStds(fakeFeatures, this.fakeMeans);

    // 计算先验概率
    this.realPrior = realData.length / trainingData.length;
    this.fakePrior = fakeData.length / trainingData.length;

    this.isTrained = true;

    // 计算交叉验证指标
    onProgress?.({
      stage: 'evaluation',
      progress: 90,
      message: '正在评估模型性能...',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    const metrics = this.evaluateOnData(this, trainingData);
    metrics.trainingTime = Date.now() - this.trainingStartTime;

    onProgress?.({
      stage: 'completed',
      progress: 100,
      message: '朴素贝叶斯训练完成',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    return metrics;
  }

  /**
   * 预测文本分类
   */
  predict(text: string): ClassificationResult {
    if (!this.isTrained) {
      throw new Error('模型尚未训练，请先调用train()方法');
    }

    const startTime = Date.now();
    const features = this.featureExtractor.extractFeatures(text);
    const featureVector = this.featureExtractor.getFeatureVector(features);

    // 计算朴素贝叶斯概率
    const realLogProb = this.calculateLogProbability(featureVector, this.realMeans, this.realStds) + Math.log(this.realPrior);
    const fakeLogProb = this.calculateLogProbability(featureVector, this.fakeMeans, this.fakeStds) + Math.log(this.fakePrior);

    // 归一化概率
    const maxLogProb = Math.max(realLogProb, fakeLogProb);
    const realProb = Math.exp(realLogProb - maxLogProb);
    const fakeProb = Math.exp(fakeLogProb - maxLogProb);
    const totalProb = realProb + fakeProb;

    const realNormProb = realProb / totalProb;
    const fakeNormProb = fakeProb / totalProb;

    const prediction = realNormProb > fakeNormProb ? 'real' : 'fake';
    const confidence = Math.max(realNormProb, fakeNormProb);

    // 生成解释
    const reasoning = this.generateReasoning(features, featureVector, prediction);
    const processingTime = Date.now() - startTime;

    return {
      prediction,
      confidence,
      features,
      reasoning,
      processingTime
    };
  }

  /**
   * 计算均值
   */
  private calculateMeans(features: number[][]): number[] {
    if (features.length === 0) return [];
    
    const featureCount = features[0].length;
    const means: number[] = [];

    for (let i = 0; i < featureCount; i++) {
      const sum = features.reduce((acc, feature) => acc + (feature[i] || 0), 0);
      means[i] = sum / features.length;
    }

    return means;
  }

  /**
   * 计算标准差
   */
  private calculateStds(features: number[][], means: number[]): number[] {
    if (features.length <= 1) return means.map(() => 1); // 避免除零

    const featureCount = means.length;
    const stds: number[] = [];

    for (let i = 0; i < featureCount; i++) {
      const variance = features.reduce((acc, feature) => {
        const diff = (feature[i] || 0) - means[i];
        return acc + diff * diff;
      }, 0) / (features.length - 1);
      
      stds[i] = Math.sqrt(variance) || 1; // 避免除零
    }

    return stds;
  }

  /**
   * 计算对数概率
   */
  private calculateLogProbability(featureVector: number[], means: number[], stds: number[]): number {
    let logProb = 0;

    for (let i = 0; i < featureVector.length && i < means.length; i++) {
      const value = featureVector[i] || 0;
      const mean = means[i] || 0;
      const std = stds[i] || 1;

      // 高斯概率密度函数的对数
      const logPdf = -0.5 * Math.log(2 * Math.PI * std * std) - 
                     (0.5 * Math.pow(value - mean, 2)) / (std * std);
      
      logProb += logPdf;
    }

    return logProb;
  }

  /**
   * 生成预测解释
   */
  private generateReasoning(features: TextFeatures, featureVector: number[], prediction: 'real' | 'fake'): string[] {
    const reasoning: string[] = [];

    // 基于具体特征生成解释
    if (features.exclamationCount > 1) {
      reasoning.push(`包含${features.exclamationCount}个感叹号，显示强烈情绪表达`);
    }

    if (features.clickbaitWords > 0) {
      reasoning.push(`包含${features.clickbaitWords}个标题党关键词`);
    }

    if (features.urgencyWords > 0) {
      reasoning.push(`包含${features.urgencyWords}个紧迫性词汇`);
    }

    if (features.emotionalWords > 0) {
      reasoning.push(`包含${features.emotionalWords}个情感性词汇`);
    }

    if (features.capsRatio > 0.1) {
      reasoning.push(`大写字母比例较高(${(features.capsRatio * 100).toFixed(1)}%)`);
    }

    if (features.punctuationRatio > 0.15) {
      reasoning.push(`标点符号密集，可能为了强调效果`);
    }

    if (prediction === 'real') {
      if (reasoning.length === 0) {
        reasoning.push('语言表达客观，用词规范');
        reasoning.push('缺乏明显的煽动性特征');
      }
    } else {
      if (reasoning.length === 0) {
        reasoning.push('检测到潜在的标题党特征');
      }
    }

    return reasoning;
  }

  /**
   * 获取特征重要性分析
   */
  getFeatureImportance(): { feature: string; importance: number }[] {
    if (!this.isTrained) {
      return [];
    }

    // 基于均值差异计算特征重要性
    const importances: { feature: string; importance: number }[] = [];
    
    for (let i = 0; i < this.featureNames.length && i < this.realMeans.length; i++) {
      const realMean = this.realMeans[i] || 0;
      const fakeMean = this.fakeMeans[i] || 0;
      const importance = Math.abs(realMean - fakeMean);
      
      importances.push({
        feature: this.featureNames[i],
        importance
      });
    }
    
    return importances.sort((a, b) => b.importance - a.importance);
  }

  /**
   * 解释预测结果
   */
  explainPrediction(text: string): {
    prediction: ClassificationResult;
    explanation: string[];
    visualData: any;
  } {
    const prediction = this.predict(text);
    
    const explanation = [
      '朴素贝叶斯基于特征独立性假设进行分类',
      `实际概率: ${((1 - prediction.confidence / 100) * 100).toFixed(1)}%`,
      `标题党概率: ${prediction.confidence}%`,
      `处理时间: ${prediction.processingTime}ms`
    ];

    const featureImportances = this.getFeatureImportance().slice(0, 8);
    
    return {
      prediction,
      explanation,
      visualData: {
        featureImportances,
        probabilityDistribution: {
          real: (1 - prediction.confidence / 100),
          fake: prediction.confidence / 100
        },
        modelParameters: {
          featureCount: this.featureNames.length,
          realPrior: this.realPrior,
          fakePrior: this.fakePrior
        }
      }
    };
  }

  /**
   * 检查模型是否已训练
   */
  isModelTrained(): boolean {
    return this.isTrained;
  }

  /**
   * 重置模型
   */
  reset(): void {
    this.isTrained = false;
    this.realMeans = [];
    this.realStds = [];
    this.fakeMeans = [];
    this.fakeStds = [];
    this.realPrior = 0.5;
    this.fakePrior = 0.5;
  }
}