import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { TextSample } from '../types/common';

export interface TrainingHistory {
  id: number;
  modelType: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingTime: number;
  sampleCount: number;
  createdAt: string;
}

export class FileStorage {
  private readonly dataDir: string;
  private readonly samplesFile: string;
  private readonly historyFile: string;
  private readonly metadataFile: string;

  constructor() {
    // Heroku 文件存储在 /tmp 目录
    this.dataDir = process.env.NODE_ENV === 'production' 
      ? '/tmp/data' 
      : join(__dirname, '../../../data/persistent');
      
    this.samplesFile = join(this.dataDir, 'samples.json');
    this.historyFile = join(this.dataDir, 'training_history.json');
    this.metadataFile = join(this.dataDir, 'metadata.json');

    this.ensureDirectoryExists();
    this.initializeFiles();
  }

  private ensureDirectoryExists(): void {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private initializeFiles(): void {
    // 初始化样本文件
    if (!existsSync(this.samplesFile)) {
      this.saveSamples([]);
    }

    // 初始化训练历史文件
    if (!existsSync(this.historyFile)) {
      this.saveTrainingHistory([]);
    }

    // 初始化元数据文件
    if (!existsSync(this.metadataFile)) {
      this.saveMetadata({
        version: '1.0.0',
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    }
  }

  // 样本管理
  getAllSamples(): TextSample[] {
    try {
      const data = readFileSync(this.samplesFile, 'utf-8');
      const parsed = JSON.parse(data);
      // 确保返回的是数组
      if (Array.isArray(parsed)) {
        return parsed;
      } else {
        console.warn('样本文件数据格式错误，期望数组但获得:', typeof parsed);
        return [];
      }
    } catch (error) {
      console.error('读取样本文件失败:', error);
      return [];
    }
  }

  addSample(sample: Omit<TextSample, 'id' | 'createdAt'>): TextSample {
    const samples = this.getAllSamples();
    const newSample: TextSample = {
      ...sample,
      id: this.getNextId(samples),
      createdAt: new Date().toISOString()
    };

    samples.push(newSample);
    this.saveSamples(samples);
    return newSample;
  }

  addBatchSamples(newSamples: Omit<TextSample, 'id' | 'createdAt'>[]): TextSample[] {
    const samples = this.getAllSamples();
    const addedSamples: TextSample[] = [];

    newSamples.forEach(sample => {
      const newSample: TextSample = {
        ...sample,
        id: this.getNextId([...samples, ...addedSamples]),
        createdAt: new Date().toISOString()
      };
      addedSamples.push(newSample);
    });

    samples.push(...addedSamples);
    this.saveSamples(samples);
    return addedSamples;
  }

  deleteSample(id: number): boolean {
    const samples = this.getAllSamples();
    const initialLength = samples.length;
    const filteredSamples = samples.filter(s => s.id !== id);
    
    if (filteredSamples.length < initialLength) {
      this.saveSamples(filteredSamples);
      return true;
    }
    return false;
  }

  getSampleById(id: number): TextSample | undefined {
    return this.getAllSamples().find(s => s.id === id);
  }

  clearAllSamples(): boolean {
    try {
      this.saveSamples([]);
      return true;
    } catch (error) {
      console.error('清除所有样本失败:', error);
      return false;
    }
  }

  // 训练历史管理
  getAllTrainingHistory(): TrainingHistory[] {
    try {
      const data = readFileSync(this.historyFile, 'utf-8');
      const parsed = JSON.parse(data);
      // 确保返回的是数组
      if (Array.isArray(parsed)) {
        return parsed;
      } else {
        console.warn('训练历史文件数据格式错误，期望数组但获得:', typeof parsed);
        return [];
      }
    } catch (error) {
      console.error('读取训练历史失败:', error);
      return [];
    }
  }

  addTrainingRecord(record: Omit<TrainingHistory, 'id' | 'createdAt'>): TrainingHistory {
    const history = this.getAllTrainingHistory();
    const newRecord: TrainingHistory = {
      ...record,
      id: this.getNextId(history),
      createdAt: new Date().toISOString()
    };

    history.push(newRecord);
    this.saveTrainingHistory(history);
    return newRecord;
  }

  // 统计信息
  getStats() {
    const samples = this.getAllSamples();
    const normalCount = samples.filter(s => s.label === 'normal').length;
    const clickbaitCount = samples.filter(s => s.label === 'clickbait').length;
    const totalCount = samples.length;
    
    const avgQuality = totalCount > 0 
      ? samples.reduce((sum, s) => sum + s.qualityScore, 0) / totalCount 
      : 0;

    return {
      total: totalCount,
      normalCount,
      clickbaitCount,
      averageQuality: Math.round(avgQuality * 100) / 100,
      canTrain: normalCount >= 2 && clickbaitCount >= 2
    };
  }

  // 数据备份和恢复
  createBackup(): { backupId: string; timestamp: string } {
    const timestamp = new Date().toISOString();
    const backupId = `backup_${Date.now()}`;
    
    const backupData = {
      samples: this.getAllSamples(),
      history: this.getAllTrainingHistory(),
      metadata: this.getMetadata(),
      timestamp,
      backupId
    };

    const backupFile = join(this.dataDir, `${backupId}.json`);
    writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

    return { backupId, timestamp };
  }

  // 健康检查
  healthCheck(): { status: string; details: any } {
    try {
      const samples = this.getAllSamples();
      const history = this.getAllTrainingHistory();
      const metadata = this.getMetadata();

      return {
        status: 'healthy',
        details: {
          samplesCount: samples.length,
          historyCount: history.length,
          lastUpdated: metadata.lastUpdated,
          storageType: 'file_system'
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: {
          error: error instanceof Error ? error.message : '未知错误'
        }
      };
    }
  }

  // 私有方法
  private saveSamples(samples: TextSample[]): void {
    writeFileSync(this.samplesFile, JSON.stringify(samples, null, 2));
    this.updateMetadata();
  }

  private saveTrainingHistory(history: TrainingHistory[]): void {
    writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
    this.updateMetadata();
  }

  private saveMetadata(metadata: any): void {
    writeFileSync(this.metadataFile, JSON.stringify(metadata, null, 2));
  }

  private getMetadata(): any {
    try {
      const data = readFileSync(this.metadataFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return {
        version: '1.0.0',
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
    }
  }

  private updateMetadata(): void {
    const metadata = this.getMetadata();
    metadata.lastUpdated = new Date().toISOString();
    this.saveMetadata(metadata);
  }

  // 加载预设训练数据
  loadPresetTrainingData(): { success: boolean; message: string; count?: number } {
    try {
      const datasetPath = join(__dirname, '../../../data/datasets/training_100_samples.json');
      
      if (!existsSync(datasetPath)) {
        return {
          success: false,
          message: '预设训练数据文件不存在'
        };
      }

      const datasetContent = readFileSync(datasetPath, 'utf-8');
      const dataset = JSON.parse(datasetContent);
      
      if (!dataset.samples || !Array.isArray(dataset.samples)) {
        return {
          success: false,
          message: '预设训练数据格式无效'
        };
      }

      // 转换数据格式
      const samples: TextSample[] = dataset.samples.map((item: any, index: number) => ({
        id: this.getNextId(this.getAllSamples()) + index,
        content: item.content,
        label: item.label,
        wordCount: item.content.split(/\s+/).length,
        qualityScore: item.qualityMetrics?.reliabilityScore || 0.5,
        createdAt: new Date().toISOString()
      }));

      // 清空现有数据并加载新数据
      this.clearAllSamples();
      const currentSamples = this.getAllSamples();
      currentSamples.push(...samples);
      this.saveSamples(currentSamples);
      
      return {
        success: true,
        message: `成功加载 ${samples.length} 条预设训练数据`,
        count: samples.length
      };
    } catch (error) {
      console.error('加载预设训练数据失败:', error);
      return {
        success: false,
        message: `加载预设训练数据失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  private getNextId(items: { id: number }[]): number {
    if (!Array.isArray(items) || items.length === 0) return 1;
    
    // 过滤出有效的ID值
    const validIds = items
      .map(item => item?.id)
      .filter(id => typeof id === 'number' && !isNaN(id));
    
    if (validIds.length === 0) return 1;
    return Math.max(...validIds) + 1;
  }
}

// 单例实例
export const fileStorage = new FileStorage();