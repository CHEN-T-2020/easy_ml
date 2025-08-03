import natural from 'natural';
// @ts-ignore
import { removeStopwords } from 'stopword';
// @ts-ignore
import nlp from 'compromise';

export interface TextFeatures {
  // 基础特征
  length: number;
  wordCount: number;
  sentenceCount: number;
  
  // 标题党特征
  exclamationCount: number;
  questionCount: number;
  capsRatio: number;
  
  // 情感特征
  clickbaitWords: number;
  urgencyWords: number;
  emotionalWords: number;
  
  // 语言特征
  averageWordLength: number;
  punctuationRatio: number;
  
  // TF-IDF向量
  tfidfVector: number[];
}

export class TextFeatureExtractor {
  private tokenizer: natural.WordTokenizer;
  private tfidf: natural.TfIdf;
  
  // 标题党关键词
  private readonly clickbaitWords = [
    '震惊', '重磅', '惊人', '绝密', '神奇', '史上最', '前所未有',
    '不敢相信', '太可怕了', '必须知道', '赶紧看', '速看', '火爆',
    '轰动', '疯传', '刷屏', '爆红', '走红', '热议'
  ];
  
  // 紧迫性词汇
  private readonly urgencyWords = [
    '马上', '立即', '赶紧', '快速', '紧急', '限时', '倒计时',
    '最后机会', '错过就没了', '仅此一次', '今日', '本周'
  ];
  
  // 情感词汇
  private readonly emotionalWords = [
    '愤怒', '激动', '兴奋', '感动', '震撼', '惊喜', '恐怖',
    '可怕', '美爆了', '太棒了', '完美', '糟糕', '悲惨'
  ];

  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
  }

  /**
   * 从文本中提取特征
   */
  extractFeatures(text: string): TextFeatures {
    const cleanText = text.trim();
    const tokens = this.tokenizer.tokenize(cleanText) || [];
    // Simple sentence counting by splitting on punctuation
    const sentences = cleanText.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    
    // 去除停用词
    const filteredTokens = removeStopwords(tokens, ['zh', 'en']);
    
    // 基础特征
    const length = cleanText.length;
    const wordCount = tokens.length;
    const sentenceCount = sentences.length;
    
    // 标点符号统计
    const exclamationCount = (cleanText.match(/！|!/g) || []).length;
    const questionCount = (cleanText.match(/？|\?/g) || []).length;
    const punctuationCount = (cleanText.match(/[！？。，；：、""''（）【】]/g) || []).length;
    const punctuationRatio = length > 0 ? punctuationCount / length : 0;
    
    // 大写字母比例（针对英文）
    const upperCaseCount = (cleanText.match(/[A-Z]/g) || []).length;
    const capsRatio = length > 0 ? upperCaseCount / length : 0;
    
    // 特殊词汇统计
    const clickbaitWords = this.countWords(cleanText, this.clickbaitWords);
    const urgencyWords = this.countWords(cleanText, this.urgencyWords);
    const emotionalWords = this.countWords(cleanText, this.emotionalWords);
    
    // 平均词长
    const averageWordLength = tokens.length > 0 
      ? tokens.reduce((sum, token) => sum + token.length, 0) / tokens.length 
      : 0;
    
    // TF-IDF特征（使用过滤后的词汇）
    const tfidfVector = this.computeTfIdfVector(filteredTokens);
    
    return {
      length,
      wordCount,
      sentenceCount,
      exclamationCount,
      questionCount,
      capsRatio,
      clickbaitWords,
      urgencyWords,
      emotionalWords,
      averageWordLength,
      punctuationRatio,
      tfidfVector
    };
  }
  
  /**
   * 训练TF-IDF模型
   */
  trainTfIdf(documents: string[]): void {
    this.tfidf = new natural.TfIdf();
    documents.forEach(doc => {
      const tokens = this.tokenizer.tokenize(doc) || [];
      const filteredTokens = removeStopwords(tokens, ['zh', 'en']);
      this.tfidf.addDocument(filteredTokens);
    });
  }
  
  /**
   * 计算TF-IDF向量
   */
  private computeTfIdfVector(tokens: string[]): number[] {
    const vector: number[] = [];
    
    // 临时添加文档以计算TF-IDF
    this.tfidf.addDocument(tokens);
    const docIndex = this.tfidf.documents.length - 1; // 使用刚添加的文档索引
    
    // 获取所有术语的TF-IDF值
    try {
      this.tfidf.listTerms(docIndex).forEach(item => {
        vector.push(item.tfidf);
      });
    } catch (error) {
      console.warn('TF-IDF计算错误:', error);
    }
    
    // 如果向量为空或长度不足，填充为固定长度
    const targetLength = 20; // 减少向量长度以提高效率
    while (vector.length < targetLength) {
      vector.push(0);
    }
    
    return vector.slice(0, targetLength);
  }
  
  /**
   * 统计特定词汇出现次数
   */
  private countWords(text: string, wordList: string[]): number {
    let count = 0;
    wordList.forEach(word => {
      const regex = new RegExp(word, 'gi');
      const matches = text.match(regex);
      if (matches) {
        count += matches.length;
      }
    });
    return count;
  }
  
  /**
   * 获取特征向量（用于机器学习）
   */
  getFeatureVector(features: TextFeatures): number[] {
    return [
      features.length / 100, // 归一化长度
      features.wordCount / 50, // 归一化词数
      features.sentenceCount,
      features.exclamationCount,
      features.questionCount,
      features.capsRatio,
      features.clickbaitWords,
      features.urgencyWords,
      features.emotionalWords,
      features.averageWordLength / 10, // 归一化平均词长
      features.punctuationRatio,
      ...features.tfidfVector.slice(0, 20) // 取前20个TF-IDF特征
    ];
  }
}