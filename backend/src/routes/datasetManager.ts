import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { samples } from './textSamples';

const router = express.Router();

// 增强的数据样本接口
interface EnhancedTextSample {
  id: number;
  content: string;
  label: 'normal' | 'clickbait';
  category: string;
  source?: string;
  confidence?: number;
  createdAt: Date;
  updatedAt?: Date;
  
  qualityMetrics: {
    wordCount: number;
    complexityScore: number;
    reliabilityScore: number;
  };
  
  metadata: {
    datasetType: 'training' | 'demo' | 'user';
    contributor?: string;
    version: number;
  };
}

// 数据集接口
interface Dataset {
  name: string;
  description: string;
  version: string;
  createdAt: string;
  totalSamples: number;
  normalCount: number;
  clickbaitCount: number;
  samples: EnhancedTextSample[];
}

// 数据存储管理器
class DataStorageManager {
  private dataDir = path.join(process.cwd(), '..', 'data');
  private persistentDir = path.join(this.dataDir, 'persistent');
  private datasetsDir = path.join(this.dataDir, 'datasets');
  private exportsDir = path.join(this.dataDir, 'exports');

  constructor() {
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.persistentDir, { recursive: true });
      await fs.mkdir(this.datasetsDir, { recursive: true });
      await fs.mkdir(this.exportsDir, { recursive: true });
    } catch (error) {
      console.error('创建数据目录失败:', error);
    }
  }

  // 加载训练数据集
  async loadTrainingDataset(): Promise<Dataset | null> {
    try {
      const filePath = path.join(this.datasetsDir, 'training_100_samples.json');
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('加载训练数据集失败:', error);
      return null;
    }
  }

  // 保存数据到持久化文件
  async saveToFile(samples: EnhancedTextSample[]): Promise<void> {
    try {
      const filePath = path.join(this.persistentDir, 'samples.json');
      const backupPath = path.join(this.persistentDir, 'samples_backup.json');
      
      // 创建备份
      try {
        await fs.copyFile(filePath, backupPath);
      } catch (error) {
        // 如果原文件不存在，忽略备份错误
      }

      // 保存新数据
      const data = {
        lastUpdated: new Date().toISOString(),
        totalSamples: samples.length,
        samples: samples
      };
      
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      
      // 更新元数据
      await this.updateMetadata(samples);
    } catch (error) {
      console.error('保存数据到文件失败:', error);
      throw error;
    }
  }

  // 从持久化文件加载数据
  async loadFromFile(): Promise<EnhancedTextSample[]> {
    try {
      const filePath = path.join(this.persistentDir, 'samples.json');
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      return parsed.samples || [];
    } catch (error) {
      console.error('从文件加载数据失败:', error);
      return [];
    }
  }

  // 更新元数据
  private async updateMetadata(samples: EnhancedTextSample[]) {
    const metadata = {
      lastUpdated: new Date().toISOString(),
      totalSamples: samples.length,
      normalCount: samples.filter(s => s.label === 'normal').length,
      clickbaitCount: samples.filter(s => s.label === 'clickbait').length,
      categories: [...new Set(samples.map(s => s.category))],
      averageQuality: samples.reduce((sum, s) => sum + s.qualityMetrics.reliabilityScore, 0) / samples.length,
      datasetTypes: {
        training: samples.filter(s => s.metadata.datasetType === 'training').length,
        demo: samples.filter(s => s.metadata.datasetType === 'demo').length,
        user: samples.filter(s => s.metadata.datasetType === 'user').length
      }
    };

    const metadataPath = path.join(this.persistentDir, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  // 导出为CSV
  async exportToCSV(samples: EnhancedTextSample[]): Promise<string> {
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `export_${timestamp}.csv`;
    const filePath = path.join(this.exportsDir, filename);

    const headers = [
      'ID', 'Content', 'Label', 'Category', 'Source', 'WordCount', 
      'ComplexityScore', 'ReliabilityScore', 'DatasetType', 'CreatedAt'
    ];

    const csvContent = [
      headers.join(','),
      ...samples.map(sample => [
        sample.id,
        `"${sample.content.replace(/"/g, '""')}"`,
        sample.label,
        sample.category,
        sample.source || '',
        sample.qualityMetrics.wordCount,
        sample.qualityMetrics.complexityScore,
        sample.qualityMetrics.reliabilityScore,
        sample.metadata.datasetType,
        sample.createdAt
      ].join(','))
    ].join('\n');

    await fs.writeFile(filePath, csvContent);
    return filename;
  }

  // 创建备份
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup_${timestamp}`;
    const backupPath = path.join(this.persistentDir, `${backupId}.json`);
    
    try {
      const currentData = await this.loadFromFile();
      await fs.writeFile(backupPath, JSON.stringify({
        backupId,
        createdAt: new Date().toISOString(),
        samples: currentData
      }, null, 2));
      
      return backupId;
    } catch (error) {
      console.error('创建备份失败:', error);
      throw error;
    }
  }
}

const dataManager = new DataStorageManager();

// API 路由

// 加载训练数据集
router.get('/datasets/training', async (req, res) => {
  try {
    const dataset = await dataManager.loadTrainingDataset();
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: '训练数据集不存在'
      });
    }

    res.json({
      success: true,
      data: dataset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '加载训练数据集失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 将训练数据集导入到系统中
router.post('/datasets/training/import', async (req, res) => {
  try {
    const dataset = await dataManager.loadTrainingDataset();
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: '训练数据集不存在'
      });
    }

    // 获取当前最大的ID，以避免冲突
    const maxId = samples.length > 0 ? Math.max(...samples.map(s => s.id)) : 0;
    let currentId = maxId + 1;

    // 转换为系统格式并添加到samples数组
    const newSamples = dataset.samples.map(sample => {
      const newSample = {
        id: currentId++,
        content: sample.content,
        label: sample.label as 'normal' | 'clickbait',
        wordCount: sample.qualityMetrics.wordCount,
        qualityScore: sample.qualityMetrics.reliabilityScore,
        createdAt: new Date()
      };
      
      // 直接添加到共享的samples数组
      samples.push(newSample);
      
      return newSample;
    });

    // 保存到持久化存储
    await dataManager.saveToFile(dataset.samples);

    res.json({
      success: true,
      data: {
        importedCount: newSamples.length,
        normalCount: dataset.normalCount,
        clickbaitCount: dataset.clickbaitCount,
        samples: newSamples
      },
      message: `成功导入 ${newSamples.length} 条训练数据`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '导入训练数据集失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 导出数据为CSV
router.get('/export/csv', async (req, res) => {
  try {
    const samples = await dataManager.loadFromFile();
    const filename = await dataManager.exportToCSV(samples);
    
    res.json({
      success: true,
      data: {
        filename,
        totalSamples: samples.length,
        downloadUrl: `/api/data-manager/download/${filename}`
      },
      message: '数据导出成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '导出数据失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 创建数据备份
router.post('/backup', async (req, res) => {
  try {
    const backupId = await dataManager.createBackup();
    
    res.json({
      success: true,
      data: { backupId },
      message: '数据备份创建成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建备份失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 获取数据统计信息
router.get('/stats', async (req, res) => {
  try {
    const metadataPath = path.join(process.cwd(), '..', 'data', 'persistent', 'metadata.json');
    
    try {
      const metadata = await fs.readFile(metadataPath, 'utf-8');
      const stats = JSON.parse(metadata);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      // 如果没有元数据文件，返回基本统计
      const samples = await dataManager.loadFromFile();
      const basicStats = {
        totalSamples: samples.length,
        normalCount: samples.filter(s => s.label === 'normal').length,
        clickbaitCount: samples.filter(s => s.label === 'clickbait').length,
        lastUpdated: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: basicStats
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;