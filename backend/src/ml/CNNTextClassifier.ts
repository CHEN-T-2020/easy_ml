import { 
  BaseClassifier, 
  TrainingData, 
  ClassificationResult, 
  TrainingMetrics, 
  ModelInfo,
  TrainingProgress 
} from './BaseClassifier';
import { TextFeatureExtractor, TextFeatures } from './TextFeatureExtractor';

interface ConvLayer {
  kernelSize: number;
  numFilters: number;
  weights: number[][][]; // [filter][position][feature]
  biases: number[];
}

interface DenseLayer {
  weights: number[][];
  biases: number[];
}

interface CNNModel {
  embedding: number[][]; // 词嵌入矩阵
  convLayers: ConvLayer[];
  denseLayer: DenseLayer;
  vocabulary: Map<string, number>;
  maxSequenceLength: number;
}

export class CNNTextClassifier extends BaseClassifier {
  private featureExtractor: TextFeatureExtractor;
  private model: CNNModel | null = null;
  private readonly embeddingDim = 50;
  private readonly maxSequenceLength = 100;
  private readonly numFilters = 64;
  private readonly kernelSizes = [3, 4, 5]; // 不同大小的卷积核
  private readonly learningRate = 0.01;
  private readonly epochs = 20;

  constructor() {
    super();
    this.featureExtractor = new TextFeatureExtractor();
  }

  getModelInfo(): ModelInfo {
    return {
      name: 'CNN文本分类器',
      type: 'deep_learning',
      description: '基于卷积神经网络的文本分类模型，能够捕获n-gram特征模式',
      advantages: [
        '能够自动学习文本特征',
        '对局部特征敏感',
        '适合短文本分类',
        '并行计算能力强',
        '对词序不敏感但保留位置信息'
      ],
      disadvantages: [
        '需要较多训练数据',
        '训练时间较长',
        '模型解释性较差',
        '参数调优复杂',
        '对序列长度敏感'
      ],
      complexity: 'high'
    };
  }

  async train(
    trainingData: TrainingData[], 
    onProgress?: (progress: TrainingProgress) => void
  ): Promise<TrainingMetrics> {
    this.trainingStartTime = Date.now();
    
    if (trainingData.length < 10) {
      throw new Error('CNN模型需要至少10个训练样本');
    }

    const realData = trainingData.filter(d => d.label === 'real');
    const fakeData = trainingData.filter(d => d.label === 'fake');

    if (realData.length < 3 || fakeData.length < 3) {
      throw new Error('每个类别至少需要3个样本');
    }

    // 1. 构建词汇表
    onProgress?.({
      stage: 'vocabulary',
      progress: 10,
      message: '正在构建词汇表...',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    const vocabulary = this.buildVocabulary(trainingData.map(d => d.text));
    
    // 2. 文本向量化
    onProgress?.({
      stage: 'vectorization',
      progress: 20,
      message: '正在向量化文本...',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    const sequences = this.textsToSequences(trainingData.map(d => d.text), vocabulary);
    const labels = trainingData.map(d => d.label === 'fake' ? 1 : 0);

    // 3. 初始化模型
    onProgress?.({
      stage: 'initialization',
      progress: 30,
      message: '正在初始化CNN模型...',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    this.model = this.initializeModel(vocabulary);

    // 4. 训练模型
    onProgress?.({
      stage: 'training',
      progress: 40,
      message: '正在训练CNN模型...',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    await this.trainModel(sequences, labels, onProgress);

    this.isTrained = true;
    
    // 5. 评估模型
    onProgress?.({
      stage: 'evaluation',
      progress: 95,
      message: '正在评估模型性能...',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    const metrics = this.evaluateOnData(this, trainingData);
    metrics.trainingTime = Date.now() - this.trainingStartTime;

    onProgress?.({
      stage: 'completed',
      progress: 100,
      message: 'CNN模型训练完成',
      timeElapsed: Date.now() - this.trainingStartTime
    });

    return metrics;
  }

  predict(text: string): ClassificationResult {
    if (!this.isTrained || !this.model) {
      throw new Error('模型尚未训练，请先调用train()方法');
    }

    const startTime = Date.now();
    const features = this.featureExtractor.extractFeatures(text);
    
    // 文本向量化
    const sequence = this.textToSequence(text, this.model.vocabulary);
    
    // 前向传播
    const prediction = this.forward(sequence);
    const confidence = Math.max(prediction, 1 - prediction);
    const label = prediction > 0.5 ? 'fake' : 'real';

    // 生成解释
    const reasoning = this.generateReasoning(text, features, prediction);
    const processingTime = Date.now() - startTime;

    return {
      prediction: label,
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
    this.model = null;
  }

  explainPrediction(text: string): {
    prediction: ClassificationResult;
    explanation: string[];
    visualData: any;
  } {
    const prediction = this.predict(text);
    
    const explanation = [
      `使用${this.kernelSizes.length}种不同大小的卷积核`,
      `词嵌入维度: ${this.embeddingDim}`,
      `最大序列长度: ${this.maxSequenceLength}`,
      `卷积滤波器数量: ${this.numFilters}`,
      `预测耗时: ${prediction.processingTime}ms`
    ];

    if (this.model) {
      const sequence = this.textToSequence(text, this.model.vocabulary);
      const activations = this.getConvActivations(sequence);
      
      return {
        prediction,
        explanation,
        visualData: {
          convActivations: activations,
          sequenceLength: sequence.length,
          vocabularySize: this.model.vocabulary.size,
          modelParameters: {
            embeddingDim: this.embeddingDim,
            kernelSizes: this.kernelSizes,
            numFilters: this.numFilters
          }
        }
      };
    }

    return {
      prediction,
      explanation,
      visualData: null
    };
  }

  // 构建词汇表
  private buildVocabulary(texts: string[]): Map<string, number> {
    const wordCounts = new Map<string, number>();
    
    // 统计词频
    for (const text of texts) {
      const words = this.tokenize(text);
      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
    
    // 按频率排序，取前1000个词
    const sortedWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1000)
      .map(([word]) => word);
    
    const vocabulary = new Map<string, number>();
    vocabulary.set('<PAD>', 0);  // 填充标记
    vocabulary.set('<UNK>', 1);  // 未知词标记
    
    sortedWords.forEach((word, index) => {
      vocabulary.set(word, index + 2);
    });
    
    return vocabulary;
  }

  // 简单分词
  private tokenize(text: string): string[] {
    // 移除标点符号并分词
    return text.toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  // 文本转序列
  private textToSequence(text: string, vocabulary: Map<string, number>): number[] {
    const words = this.tokenize(text);
    const sequence = words.map(word => 
      vocabulary.get(word) || vocabulary.get('<UNK>') || 1
    );
    
    // 填充或截断到固定长度
    if (sequence.length > this.maxSequenceLength) {
      return sequence.slice(0, this.maxSequenceLength);
    } else {
      while (sequence.length < this.maxSequenceLength) {
        sequence.push(0); // 填充标记
      }
      return sequence;
    }
  }

  // 批量文本转序列
  private textsToSequences(texts: string[], vocabulary: Map<string, number>): number[][] {
    return texts.map(text => this.textToSequence(text, vocabulary));
  }

  // 初始化模型
  private initializeModel(vocabulary: Map<string, number>): CNNModel {
    const vocabSize = vocabulary.size;
    
    // 初始化词嵌入矩阵
    const embedding: number[][] = [];
    for (let i = 0; i < vocabSize; i++) {
      const row: number[] = [];
      for (let j = 0; j < this.embeddingDim; j++) {
        row.push((Math.random() - 0.5) * 0.1); // 小的随机初始化
      }
      embedding.push(row);
    }

    // 初始化卷积层
    const convLayers: ConvLayer[] = [];
    for (const kernelSize of this.kernelSizes) {
      const weights: number[][][] = [];
      const biases: number[] = [];
      
      for (let i = 0; i < this.numFilters; i++) {
        const filter: number[][] = [];
        for (let j = 0; j < kernelSize; j++) {
          const row: number[] = [];
          for (let k = 0; k < this.embeddingDim; k++) {
            row.push((Math.random() - 0.5) * 0.1);
          }
          filter.push(row);
        }
        weights.push(filter);
        biases.push(0);
      }
      
      convLayers.push({
        kernelSize,
        numFilters: this.numFilters,
        weights,
        biases
      });
    }

    // 初始化全连接层
    const denseInputSize = this.kernelSizes.length * this.numFilters;
    const denseWeights: number[][] = [];
    const denseBiases: number[] = [];
    
    for (let i = 0; i < denseInputSize; i++) {
      denseWeights.push([(Math.random() - 0.5) * 0.1]);
    }
    denseBiases.push(0);

    return {
      embedding,
      convLayers,
      denseLayer: {
        weights: denseWeights,
        biases: denseBiases
      },
      vocabulary,
      maxSequenceLength: this.maxSequenceLength
    };
  }

  // 前向传播
  private forward(sequence: number[]): number {
    if (!this.model) {
      throw new Error('模型未初始化');
    }

    // 1. 词嵌入
    const embedded: number[][] = [];
    for (const wordId of sequence) {
      if (wordId < this.model.embedding.length) {
        embedded.push([...this.model.embedding[wordId]]);
      } else {
        embedded.push(new Array(this.embeddingDim).fill(0));
      }
    }

    // 2. 卷积和池化
    const pooledFeatures: number[] = [];
    
    for (const convLayer of this.model.convLayers) {
      const convOutputs: number[] = [];
      
      // 卷积操作
      for (let i = 0; i <= embedded.length - convLayer.kernelSize; i++) {
        for (let f = 0; f < convLayer.numFilters; f++) {
          let sum = 0;
          
          for (let j = 0; j < convLayer.kernelSize; j++) {
            for (let k = 0; k < this.embeddingDim; k++) {
              sum += embedded[i + j][k] * convLayer.weights[f][j][k];
            }
          }
          
          sum += convLayer.biases[f];
          convOutputs.push(Math.max(0, sum)); // ReLU激活
        }
      }
      
      // 最大池化
      const poolSize = Math.floor(convOutputs.length / convLayer.numFilters);
      for (let f = 0; f < convLayer.numFilters; f++) {
        let maxVal = -Infinity;
        for (let i = 0; i < poolSize; i++) {
          const idx = f * poolSize + i;
          if (idx < convOutputs.length) {
            maxVal = Math.max(maxVal, convOutputs[idx]);
          }
        }
        pooledFeatures.push(maxVal === -Infinity ? 0 : maxVal);
      }
    }

    // 3. 全连接层
    let output = 0;
    for (let i = 0; i < pooledFeatures.length && i < this.model.denseLayer.weights.length; i++) {
      output += pooledFeatures[i] * this.model.denseLayer.weights[i][0];
    }
    output += this.model.denseLayer.biases[0];

    // 4. Sigmoid激活
    return 1 / (1 + Math.exp(-output));
  }

  // 训练模型（简化版）
  private async trainModel(
    sequences: number[][], 
    labels: number[], 
    onProgress?: (progress: TrainingProgress) => void
  ): Promise<void> {
    if (!this.model) {
      throw new Error('模型未初始化');
    }

    for (let epoch = 0; epoch < this.epochs; epoch++) {
      let totalLoss = 0;
      
      // 随机打乱数据
      const indices = Array.from({length: sequences.length}, (_, i) => i);
      this.shuffleArray(indices);
      
      for (let i = 0; i < sequences.length; i++) {
        const idx = indices[i];
        const prediction = this.forward(sequences[idx]);
        const target = labels[idx];
        
        // 计算损失 (二元交叉熵)
        const loss = -(target * Math.log(prediction + 1e-15) + 
                       (1 - target) * Math.log(1 - prediction + 1e-15));
        totalLoss += loss;
        
        // 简化的梯度下降（仅更新部分参数）
        const error = prediction - target;
        this.updateDenseLayer(error);
      }
      
      const progress = 40 + (epoch / this.epochs) * 50;
      onProgress?.({
        stage: 'training',
        progress,
        message: `训练轮次 ${epoch + 1}/${this.epochs}, 损失: ${(totalLoss / sequences.length).toFixed(4)}`,
        timeElapsed: Date.now() - this.trainingStartTime
      });
      
      // 模拟训练时间
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // 更新全连接层参数（简化版）
  private updateDenseLayer(error: number): void {
    if (!this.model) return;
    
    for (let i = 0; i < this.model.denseLayer.weights.length; i++) {
      this.model.denseLayer.weights[i][0] -= this.learningRate * error * 0.1;
    }
    this.model.denseLayer.biases[0] -= this.learningRate * error;
  }

  // 获取卷积激活值
  private getConvActivations(sequence: number[]): number[][] {
    if (!this.model) return [];
    
    const activations: number[][] = [];
    
    // 词嵌入
    const embedded: number[][] = [];
    for (const wordId of sequence) {
      if (wordId < this.model.embedding.length) {
        embedded.push([...this.model.embedding[wordId]]);
      } else {
        embedded.push(new Array(this.embeddingDim).fill(0));
      }
    }
    
    // 每个卷积层的激活
    for (const convLayer of this.model.convLayers) {
      const layerActivations: number[] = [];
      
      for (let i = 0; i <= embedded.length - convLayer.kernelSize; i++) {
        for (let f = 0; f < Math.min(5, convLayer.numFilters); f++) { // 只取前5个滤波器
          let sum = 0;
          
          for (let j = 0; j < convLayer.kernelSize; j++) {
            for (let k = 0; k < this.embeddingDim; k++) {
              sum += embedded[i + j][k] * convLayer.weights[f][j][k];
            }
          }
          
          sum += convLayer.biases[f];
          layerActivations.push(Math.max(0, sum));
        }
      }
      
      activations.push(layerActivations);
    }
    
    return activations;
  }

  // 生成预测解释
  private generateReasoning(
    text: string, 
    features: TextFeatures, 
    prediction: number
  ): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`CNN模型预测概率: ${(prediction * 100).toFixed(1)}%`);
    
    if (prediction > 0.7) {
      reasoning.push('卷积层检测到强烈的标题党特征模式');
    } else if (prediction > 0.5) {
      reasoning.push('卷积层检测到一些标题党特征');
    } else if (prediction < 0.3) {
      reasoning.push('卷积层未检测到明显的标题党特征');
    } else {
      reasoning.push('卷积层检测结果不确定');
    }
    
    // 基于传统特征的解释
    if (features.exclamationCount > 1) {
      reasoning.push(`包含多个感叹号(${features.exclamationCount}个)`);
    }
    
    if (features.clickbaitWords > 0) {
      reasoning.push(`包含${features.clickbaitWords}个标题党关键词`);
    }
    
    if (text.length > this.maxSequenceLength * 3) {
      reasoning.push('文本较长，可能被截断处理');
    }
    
    return reasoning;
  }

  // 数组随机打乱
  private shuffleArray(array: number[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}