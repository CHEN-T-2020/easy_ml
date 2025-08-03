import { 
  BaseClassifier, 
  TrainingData, 
  ClassificationResult, 
  TrainingMetrics, 
  ModelInfo,
  TrainingProgress 
} from './BaseClassifier';
import { TextFeatureExtractor, TextFeatures } from './TextFeatureExtractor';

interface DecisionTree {
  feature: number;
  threshold: number;
  left?: DecisionTree;
  right?: DecisionTree;
  prediction?: 'real' | 'fake';
  samples: number;
  gini: number;
}

interface TreeVote {
  prediction: 'real' | 'fake';
  confidence: number;
  treeIndex: number;
}

export class RandomForestClassifier extends BaseClassifier {
  private featureExtractor: TextFeatureExtractor;
  private trees: DecisionTree[] = [];
  private featureImportances: number[] = [];
  private featureNames: string[] = [];
  private numTrees: number = 50;
  private maxDepth: number = 10;
  private minSamplesSplit: number = 2;
  private maxFeatures: number = 0; // sqrt(total_features)

  constructor(options?: {
    numTrees?: number;
    maxDepth?: number;
    minSamplesSplit?: number;
  }) {
    super();
    this.featureExtractor = new TextFeatureExtractor();
    
    if (options) {
      this.numTrees = options.numTrees || 50;
      this.maxDepth = options.maxDepth || 10;
      this.minSamplesSplit = options.minSamplesSplit || 2;
    }
    
    this.featureNames = [
      '文本长度', '词汇数量', '句子数量', '感叹号数量', '问号数量',
      '大写比例', '标题党词汇', '紧迫性词汇', '情感词汇', 
      '平均词长', '标点比例', ...Array.from({length: 20}, (_, i) => `TF-IDF特征${i+1}`)
    ];
  }

  getModelInfo(): ModelInfo {
    return {
      name: '随机森林分类器',
      type: 'traditional',
      description: '基于多个决策树的集成学习方法，通过投票机制提高预测准确性',
      advantages: [
        '高准确率和泛化能力',
        '提供特征重要性分析',
        '对过拟合具有较好的抗性',
        '可以处理缺失值和异常值',
        '训练和预测速度较快'
      ],
      disadvantages: [
        '模型解释性相对较差',
        '内存占用较大',
        '对噪声数据敏感',
        '超参数调优复杂'
      ],
      complexity: 'medium'
    };
  }

  async train(
    trainingData: TrainingData[], 
    onProgress?: (progress: TrainingProgress) => void
  ): Promise<TrainingMetrics> {
    this.trainingStartTime = Date.now();
    
    if (trainingData.length < 4) {
      throw new Error('训练数据不足，至少需要4个样本（每类至少2个）');
    }

    const realData = trainingData.filter(d => d.label === 'real');
    const fakeData = trainingData.filter(d => d.label === 'fake');

    if (realData.length === 0 || fakeData.length === 0) {
      throw new Error('需要同时包含正常标题和标题党样本');
    }

    // 训练TF-IDF
    onProgress?.({
      stage: 'feature_extraction',
      progress: 10,
      message: '正在提取文本特征...',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    const allTexts = trainingData.map(d => d.text);
    this.featureExtractor.trainTfIdf(allTexts);

    // 提取特征向量
    const features: number[][] = [];
    const labels: number[] = []; // 0 = real, 1 = fake

    for (const sample of trainingData) {
      const textFeatures = this.featureExtractor.extractFeatures(sample.text);
      const featureVector = this.featureExtractor.getFeatureVector(textFeatures);
      features.push(featureVector);
      labels.push(sample.label === 'fake' ? 1 : 0);
    }

    // 设置随机特征数量
    this.maxFeatures = Math.floor(Math.sqrt(features[0].length));
    this.featureImportances = new Array(features[0].length).fill(0);

    // 训练多个决策树
    this.trees = [];
    
    for (let i = 0; i < this.numTrees; i++) {
      const progress = 10 + (i / this.numTrees) * 80;
      onProgress?.({
        stage: 'training_trees',
        progress,
        message: `正在训练第${i + 1}/${this.numTrees}棵决策树...`,
        timeElapsed: Date.now() - this.trainingStartTime
      });

      // Bootstrap采样
      const { bootstrapFeatures, bootstrapLabels } = this.bootstrapSample(features, labels);
      
      // 训练单棵树
      const tree = this.buildTree(bootstrapFeatures, bootstrapLabels, 0);
      this.trees.push(tree);

      // 等待以模拟训练时间
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    onProgress?.({
      stage: 'evaluation',
      progress: 95,
      message: '正在评估模型性能...',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    this.isTrained = true;
    
    // 计算训练指标
    const metrics = this.evaluateOnData(this, trainingData);
    metrics.trainingTime = Date.now() - this.trainingStartTime;

    onProgress?.({
      stage: 'completed',
      progress: 100,
      message: '随机森林训练完成',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    return metrics;
  }

  predict(text: string): ClassificationResult {
    if (!this.isTrained) {
      throw new Error('模型尚未训练，请先调用train()方法');
    }

    const startTime = Date.now();
    const features = this.featureExtractor.extractFeatures(text);
    const featureVector = this.featureExtractor.getFeatureVector(features);

    // 获取所有树的投票
    const votes: TreeVote[] = [];
    
    for (let i = 0; i < this.trees.length; i++) {
      const prediction = this.predictWithTree(this.trees[i], featureVector);
      const confidence = this.calculateTreeConfidence(this.trees[i], featureVector);
      
      votes.push({
        prediction: prediction === 1 ? 'fake' : 'real',
        confidence,
        treeIndex: i
      });
    }

    // 统计投票结果
    const fakeVotes = votes.filter(v => v.prediction === 'fake').length;
    const realVotes = votes.filter(v => v.prediction === 'real').length;
    
    const prediction = fakeVotes > realVotes ? 'fake' : 'real';
    const confidence = Math.max(fakeVotes, realVotes) / this.trees.length;

    // 生成解释
    const reasoning = this.generateReasoning(features, votes, prediction);
    const processingTime = Date.now() - startTime;

    return {
      prediction,
      confidence: Math.round(confidence * 100),
      features,
      reasoning,
      processingTime
    };
  }

  isModelTrained(): boolean {
    return this.isTrained;
  }

  reset(): void {
    this.isTrained = false;
    this.trees = [];
    this.featureImportances = [];
  }

  getFeatureImportance(): { feature: string; importance: number }[] {
    if (!this.isTrained) {
      return [];
    }

    return this.featureNames.map((name, index) => ({
      feature: name,
      importance: this.featureImportances[index] || 0
    })).sort((a, b) => b.importance - a.importance);
  }

  explainPrediction(text: string): {
    prediction: ClassificationResult;
    explanation: string[];
    visualData: any;
  } {
    const prediction = this.predict(text);
    
    const explanation = [
      `使用${this.trees.length}棵决策树进行集成预测`,
      `特征向量维度: ${this.featureNames.length}`,
      `预测耗时: ${prediction.processingTime}ms`
    ];

    const featureImportances = this.getFeatureImportance().slice(0, 10);
    
    return {
      prediction,
      explanation,
      visualData: {
        featureImportances,
        treeCount: this.trees.length,
        modelParameters: {
          numTrees: this.numTrees,
          maxDepth: this.maxDepth,
          maxFeatures: this.maxFeatures
        }
      }
    };
  }

  // Bootstrap采样
  private bootstrapSample(features: number[][], labels: number[]) {
    const n = features.length;
    const bootstrapFeatures: number[][] = [];
    const bootstrapLabels: number[] = [];
    
    for (let i = 0; i < n; i++) {
      const randomIndex = Math.floor(Math.random() * n);
      bootstrapFeatures.push([...features[randomIndex]]);
      bootstrapLabels.push(labels[randomIndex]);
    }
    
    return { bootstrapFeatures, bootstrapLabels };
  }

  // 构建决策树
  private buildTree(
    features: number[][], 
    labels: number[], 
    depth: number
  ): DecisionTree {
    const samples = features.length;
    
    // 终止条件
    if (depth >= this.maxDepth || 
        samples < this.minSamplesSplit || 
        this.isHomogeneous(labels)) {
      
      const prediction = this.majorityClass(labels);
      return {
        feature: -1,
        threshold: 0,
        prediction: prediction === 1 ? 'fake' : 'real',
        samples,
        gini: this.calculateGini(labels)
      };
    }

    // 随机选择特征子集
    const featureIndices = this.selectRandomFeatures(features[0].length);
    let bestSplit = this.findBestSplit(features, labels, featureIndices);
    
    if (!bestSplit) {
      const prediction = this.majorityClass(labels);
      return {
        feature: -1,
        threshold: 0,
        prediction: prediction === 1 ? 'fake' : 'real',
        samples,
        gini: this.calculateGini(labels)
      };
    }

    // 分割数据
    const { leftFeatures, leftLabels, rightFeatures, rightLabels } = 
      this.splitData(features, labels, bestSplit.feature, bestSplit.threshold);

    // 更新特征重要性
    this.featureImportances[bestSplit.feature] += bestSplit.importance;

    // 递归构建子树
    const left = this.buildTree(leftFeatures, leftLabels, depth + 1);
    const right = this.buildTree(rightFeatures, rightLabels, depth + 1);

    return {
      feature: bestSplit.feature,
      threshold: bestSplit.threshold,
      left,
      right,
      samples,
      gini: this.calculateGini(labels)
    };
  }

  // 选择随机特征子集
  private selectRandomFeatures(totalFeatures: number): number[] {
    const indices: number[] = [];
    const selected = new Set<number>();
    
    while (indices.length < this.maxFeatures) {
      const randomIndex = Math.floor(Math.random() * totalFeatures);
      if (!selected.has(randomIndex)) {
        selected.add(randomIndex);
        indices.push(randomIndex);
      }
    }
    
    return indices;
  }

  // 找到最佳分割点
  private findBestSplit(
    features: number[][], 
    labels: number[], 
    featureIndices: number[]
  ) {
    let bestGini = Infinity;
    let bestSplit: { feature: number; threshold: number; importance: number } | null = null;
    
    for (const featureIndex of featureIndices) {
      const values = features.map(f => f[featureIndex]).sort((a, b) => a - b);
      const uniqueValues = [...new Set(values)];
      
      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
        const gini = this.calculateSplitGini(features, labels, featureIndex, threshold);
        
        if (gini < bestGini) {
          bestGini = gini;
          bestSplit = {
            feature: featureIndex,
            threshold,
            importance: this.calculateGini(labels) - gini
          };
        }
      }
    }
    
    return bestSplit;
  }

  // 分割数据
  private splitData(
    features: number[][], 
    labels: number[], 
    featureIndex: number, 
    threshold: number
  ) {
    const leftFeatures: number[][] = [];
    const leftLabels: number[] = [];
    const rightFeatures: number[][] = [];
    const rightLabels: number[] = [];
    
    for (let i = 0; i < features.length; i++) {
      if (features[i][featureIndex] <= threshold) {
        leftFeatures.push(features[i]);
        leftLabels.push(labels[i]);
      } else {
        rightFeatures.push(features[i]);
        rightLabels.push(labels[i]);
      }
    }
    
    return { leftFeatures, leftLabels, rightFeatures, rightLabels };
  }

  // 计算基尼不纯度
  private calculateGini(labels: number[]): number {
    if (labels.length === 0) return 0;
    
    const counts = labels.reduce((acc, label) => {
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    let gini = 1;
    for (const count of Object.values(counts)) {
      const p = count / labels.length;
      gini -= p * p;
    }
    
    return gini;
  }

  // 计算分割后的加权基尼不纯度
  private calculateSplitGini(
    features: number[][], 
    labels: number[], 
    featureIndex: number, 
    threshold: number
  ): number {
    const { leftLabels, rightLabels } = 
      this.splitData(features, labels, featureIndex, threshold);
    
    const totalSamples = labels.length;
    const leftWeight = leftLabels.length / totalSamples;
    const rightWeight = rightLabels.length / totalSamples;
    
    return leftWeight * this.calculateGini(leftLabels) + 
           rightWeight * this.calculateGini(rightLabels);
  }

  // 检查标签是否同质
  private isHomogeneous(labels: number[]): boolean {
    return labels.every(label => label === labels[0]);
  }

  // 多数类
  private majorityClass(labels: number[]): number {
    const counts = labels.reduce((acc, label) => {
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    return parseInt(Object.keys(counts).reduce((a, b) => 
      counts[parseInt(a)] > counts[parseInt(b)] ? a : b
    ));
  }

  // 使用单棵树预测
  private predictWithTree(tree: DecisionTree, features: number[]): number {
    if (tree.prediction !== undefined) {
      return tree.prediction === 'fake' ? 1 : 0;
    }
    
    if (features[tree.feature] <= tree.threshold) {
      return tree.left ? this.predictWithTree(tree.left, features) : 0;
    } else {
      return tree.right ? this.predictWithTree(tree.right, features) : 1;
    }
  }

  // 计算树的置信度
  private calculateTreeConfidence(tree: DecisionTree, features: number[]): number {
    if (tree.prediction !== undefined) {
      return 1 - tree.gini; // 基尼不纯度越低，置信度越高
    }
    
    if (features[tree.feature] <= tree.threshold) {
      return tree.left ? this.calculateTreeConfidence(tree.left, features) : 0.5;
    } else {
      return tree.right ? this.calculateTreeConfidence(tree.right, features) : 0.5;
    }
  }

  // 生成预测解释
  private generateReasoning(
    features: TextFeatures, 
    votes: TreeVote[], 
    prediction: 'real' | 'fake'
  ): string[] {
    const reasoning: string[] = [];
    
    const fakeVotes = votes.filter(v => v.prediction === 'fake').length;
    const realVotes = votes.filter(v => v.prediction === 'real').length;
    
    reasoning.push(`${this.trees.length}棵决策树投票结果: ${fakeVotes}票标题党, ${realVotes}票正常标题`);
    
    // 基于特征的解释
    if (features.exclamationCount > 1) {
      reasoning.push(`包含${features.exclamationCount}个感叹号，显示强烈情绪表达`);
    }
    
    if (features.clickbaitWords > 0) {
      reasoning.push(`包含${features.clickbaitWords}个标题党关键词`);
    }
    
    if (features.urgencyWords > 0) {
      reasoning.push(`包含${features.urgencyWords}个紧迫性词汇`);
    }
    
    // 特征重要性提示
    const topFeatures = this.getFeatureImportance().slice(0, 3);
    if (topFeatures.length > 0) {
      reasoning.push(`主要判断依据: ${topFeatures.map(f => f.feature).join(', ')}`);
    }
    
    if (prediction === 'real' && reasoning.length === 1) {
      reasoning.push('多数决策树认为语言表达客观，用词规范');
    }
    
    return reasoning;
  }
}