import React, { useState, useEffect } from 'react';
import { useComparisonState } from '../utils/stateManager';
import './styles.css';

interface ModelInfo {
  name: string;
  type: string;
  description: string;
  advantages: string[];
  disadvantages: string[];
  complexity: string;
}

interface TrainingMetrics {
  // 训练集指标
  trainAccuracy: number;
  trainPrecision: number;
  trainRecall: number;
  trainF1Score: number;
  
  // 测试集指标
  testAccuracy: number;
  testPrecision: number;
  testRecall: number;
  testF1Score: number;
  
  // 通用指标（保持向后兼容）
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingTime: number;
  
  // 数据集信息
  datasetInfo: {
    totalSamples: number;
    trainSize: number;
    testSize: number;
    splitRatio: number;
    classDistribution: {
      normal: { train: number; test: number };
      clickbait: { train: number; test: number };
    };
  };
  
  // 模型性能差异（过拟合检测）
  overfit: {
    accuracyGap: number;  // 训练集 - 测试集准确率差异
    f1Gap: number;        // 训练集 - 测试集F1差异
    isOverfitting: boolean; // 是否存在过拟合
  };
}

interface ClassificationResult {
  prediction: 'normal' | 'clickbait';
  confidence: number;
  reasoning: string[];
  processingTime?: number;
}

interface ModelComparisonResult {
  modelType: string;
  modelInfo: ModelInfo;
  metrics: TrainingMetrics;
  prediction: ClassificationResult;
  isCurrentlyTraining: boolean;
  trainingProgress?: {
    stage: string;
    progress: number;
    message: string;
    timeElapsed: number;
  };
}

interface ComparisonSummary {
  totalModels: number;
  trainedModels: number;
  bestAccuracy: {
    modelType: string;
    accuracy: number;
  };
  fastestTraining: {
    modelType: string;
    trainingTime: number;
  };
  fastestPrediction: {
    modelType: string;
    processingTime: number;
  };
  consensusPrediction?: {
    prediction: 'normal' | 'clickbait';
    confidence: number;
    agreement: number;
  };
}

const ModelComparison: React.FC = () => {
  const {
    models,
    results: comparisonResults,
    testText,
    trainingStatus,
    updateState,
    clearResults
  } = useComparisonState();

  const [isLoading, setIsLoading] = useState(false);

  // 便捷更新函数
  const setModels = (newModels: {[key: string]: ModelInfo}) => updateState({ models: newModels });
  const setComparisonResults = (results: ModelComparisonResult[]) => updateState({ results });
  const setSummary = (newSummary: ComparisonSummary | null) => updateState({ summary: newSummary });
  const setTestText = (text: string) => updateState({ testText: text });
  const setTrainingStatus = (status: {[key: string]: boolean}) => updateState({ trainingStatus: status });
  
  // 添加当前样本数量状态
  const [currentSampleCount, setCurrentSampleCount] = React.useState<number>(0);

  // 获取模型信息
  useEffect(() => {
    fetchModelsInfo();
    const interval = setInterval(fetchTrainingStatus, 1000); // 每秒更新训练状态
    return () => clearInterval(interval);
  }, []);

  const fetchModelsInfo = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/model-comparison/models');
      const data = await response.json();
      if (data.success) {
        setModels(data.data.models);
        setTrainingStatus(data.data.trainingStatus);
        // 获取当前实时样本数量
        setCurrentSampleCount(data.data.totalSamples || 0);
      }
    } catch (error) {
      console.error('获取模型信息失败:', error);
    }
  };

  const fetchTrainingStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/model-comparison/training/status');
      const data = await response.json();
      if (data.success) {
        setTrainingStatus(data.data.trainingStatus);
        // 实时更新当前样本数量
        setCurrentSampleCount(data.data.totalSamples || 0);
        
        // 如果有训练中的模型，获取对比结果以更新进度
        if (data.data.isAnyTraining) {
          fetchComparisonResults();
        }
      }
    } catch (error) {
      console.error('获取训练状态失败:', error);
    }
  };

  const fetchComparisonResults = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/model-comparison/summary');
      const data = await response.json();
      if (data.success) {
        setComparisonResults(data.data.results);
        setSummary(data.data.summary);
      }
    } catch (error) {
      console.error('获取对比结果失败:', error);
    }
  };

  const trainModel = async (modelType: string) => {
    try {
      setIsLoading(true);
      const endpoint = modelType === 'all' 
        ? 'http://localhost:3001/api/model-comparison/models/train-all'
        : `http://localhost:3001/api/model-comparison/models/${modelType}/train`;
      
      console.log(`尝试训练${modelType === 'all' ? '所有模型' : modelType}，请求URL:`, endpoint);
      
      const response = await fetch(endpoint, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('响应状态:', response.status);
      const data = await response.json();
      console.log('响应数据:', data);
      
      if (data.success) {
        console.log(`开始训练${modelType === 'all' ? '所有模型' : modelType}`);
        alert(`开始训练${modelType === 'all' ? '所有模型' : modelType}，请查看训练进度`);
      } else {
        alert(`训练失败: ${data.message}`);
      }
    } catch (error) {
      console.error('训练失败:', error);
      alert(`训练启动失败: ${error instanceof Error ? error.message : '网络错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const compareModels = async () => {
    if (!testText.trim()) {
      alert('请输入要测试的文本');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3001/api/model-comparison/predict/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testText })
      });
      
      const data = await response.json();
      if (data.success) {
        setComparisonResults(data.data.results);
        setSummary(data.data.summary);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('对比预测失败:', error);
      alert('预测失败');
    } finally {
      setIsLoading(false);
    }
  };

  const resetModels = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/model-comparison/reset', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        clearResults(); // 使用状态管理器的清空方法
        fetchModelsInfo();
      }
    } catch (error) {
      console.error('重置失败:', error);
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#f44336';
      default: return '#999';
    }
  };

  const getModelTypeIcon = (type: string) => {
    switch (type) {
      case 'traditional': return '📊';
      case 'deep_learning': return '🧠';
      case 'rule_based': return '📝';
      default: return '🤖';
    }
  };

  return (
    <div className="model-comparison">
      <div className="comparison-header">
        <h2>🔍 模型对比分析</h2>
        <p>比较不同机器学习模型在标题党识别任务上的表现</p>
      </div>

      {/* 模型信息卡片 */}
      <div className="models-grid">
        {Object.entries(models).map(([modelType, info]) => (
          <div key={modelType} className="model-card">
            <div className="model-header">
              <span className="model-icon">{getModelTypeIcon(info.type)}</span>
              <h3>{info.name}</h3>
              <span 
                className="complexity-badge" 
                style={{ backgroundColor: getComplexityColor(info.complexity) }}
              >
                {info.complexity}
              </span>
            </div>
            
            <p className="model-description">{info.description}</p>
            
            <div className="model-details">
              <div className="advantages">
                <h4>✅ 优势</h4>
                <ul>
                  {info.advantages.slice(0, 2).map((advantage: string, index: number) => (
                    <li key={index}>{advantage}</li>
                  ))}
                </ul>
              </div>
              
              <div className="disadvantages">
                <h4>❌ 劣势</h4>
                <ul>
                  {info.disadvantages.slice(0, 2).map((disadvantage: string, index: number) => (
                    <li key={index}>{disadvantage}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="model-actions">
              {trainingStatus[modelType] ? (
                <div className="training-status">
                  <div className="loading-spinner"></div>
                  <span>训练中...</span>
                </div>
              ) : (
                <button 
                  onClick={() => trainModel(modelType)}
                  disabled={isLoading}
                  className="train-button"
                >
                  训练模型
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 训练控制 */}
      <div className="training-controls">
        {currentSampleCount > 0 && (
          <div style={{textAlign: 'center', marginBottom: '15px', color: '#666', fontSize: '0.9rem'}}>
            💾 当前数据库中有 <strong>{currentSampleCount}</strong> 个样本可用于训练
          </div>
        )}
        <button 
          onClick={() => trainModel('all')}
          disabled={isLoading || Object.values(trainingStatus).some(status => status)}
          className="train-all-button"
        >
          {Object.values(trainingStatus).some(status => status) ? '训练进行中...' : '训练所有模型'}
        </button>
        
        <button 
          onClick={resetModels}
          disabled={isLoading}
          className="reset-button"
        >
          重置所有模型
        </button>
      </div>


      {/* 测试界面 */}
      <div className="test-section">
        <h3>🧪 模型测试</h3>
        <div className="test-input">
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="输入要测试的标题内容..."
            rows={3}
            className="test-textarea"
          />
          <button 
            onClick={compareModels}
            disabled={isLoading || !testText.trim()}
            className="compare-button"
          >
            {isLoading ? '分析中...' : '对比分析'}
          </button>
        </div>
      </div>

      {/* 对比结果 */}
      {comparisonResults.length > 0 && (
        <div className="comparison-results">
          <h3>📊 对比结果</h3>
          <div className="results-grid">
            {comparisonResults.map((result) => (
              <div key={result.modelType} className="result-card">
                <div className="result-header">
                  <h4>{result.modelInfo.name}</h4>
                  {result.isCurrentlyTraining && <span className="training-indicator">训练中</span>}
                </div>
                
                {result.isCurrentlyTraining && result.trainingProgress ? (
                  <div className="training-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${result.trainingProgress.progress}%` }}
                      ></div>
                    </div>
                    <p>{result.trainingProgress.message}</p>
                    <small>耗时: {Math.round(result.trainingProgress.timeElapsed / 1000)}s</small>
                  </div>
                ) : (
                  <>
                    <div className="prediction-result">
                      <div className={`prediction-label ${result.prediction.prediction}`}>
                        {result.prediction.prediction === 'clickbait' ? '标题党' : '正常标题'}
                      </div>
                      <div className="confidence">
                        置信度: {result.prediction.confidence}%
                      </div>
                    </div>
                    
                    <div className="metrics">
                      {/* 数据集信息 */}
                      <div className="dataset-info">
                        <h5>📊 数据集信息</h5>
                        <div className="dataset-stats">
                          <span style={{backgroundColor: '#e3f2fd', color: '#1976d2'}}>
                            🔄 当前样本: {currentSampleCount}
                          </span>
                          {result.metrics.datasetInfo && (
                            <>
                              <span>上次训练: {result.metrics.datasetInfo.totalSamples}</span>
                              <span>训练集: {result.metrics.datasetInfo.trainSize}</span>
                              <span>测试集: {result.metrics.datasetInfo.testSize}</span>
                              <span>分割比例: {Math.round((1-result.metrics.datasetInfo.splitRatio)*100)}%/{Math.round(result.metrics.datasetInfo.splitRatio*100)}%</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* 性能指标对比 */}
                      <div className="performance-comparison">
                        <h5>🎯 性能对比</h5>
                        <div className="metrics-grid">
                          <div className="metric-group">
                            <h6>训练集表现</h6>
                            <div className="metric">
                              <span>准确率</span>
                              <span>{(result.metrics.trainAccuracy * 100).toFixed(1)}%</span>
                            </div>
                            <div className="metric">
                              <span>精确率</span>
                              <span>{(result.metrics.trainPrecision * 100).toFixed(1)}%</span>
                            </div>
                            <div className="metric">
                              <span>召回率</span>
                              <span>{(result.metrics.trainRecall * 100).toFixed(1)}%</span>
                            </div>
                            <div className="metric">
                              <span>F1分数</span>
                              <span>{(result.metrics.trainF1Score * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                          
                          <div className="metric-group">
                            <h6>测试集表现</h6>
                            <div className="metric">
                              <span>准确率</span>
                              <span>{(result.metrics.testAccuracy * 100).toFixed(1)}%</span>
                            </div>
                            <div className="metric">
                              <span>精确率</span>
                              <span>{(result.metrics.testPrecision * 100).toFixed(1)}%</span>
                            </div>
                            <div className="metric">
                              <span>召回率</span>
                              <span>{(result.metrics.testRecall * 100).toFixed(1)}%</span>
                            </div>
                            <div className="metric">
                              <span>F1分数</span>
                              <span>{(result.metrics.testF1Score * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 过拟合检测 */}
                        {result.metrics.overfit && (
                          <div className={`overfit-indicator ${result.metrics.overfit.isOverfitting ? 'warning' : 'good'}`}>
                            {result.metrics.overfit.isOverfitting ? (
                              <span>⚠️ 可能存在过拟合 (准确率差异: {(result.metrics.overfit.accuracyGap * 100).toFixed(1)}%)</span>
                            ) : (
                              <span>✅ 泛化良好 (准确率差异: {(result.metrics.overfit.accuracyGap * 100).toFixed(1)}%)</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* 其他指标 */}
                      <div className="additional-metrics">
                        <div className="metric">
                          <span>训练时间</span>
                          <span>{result.metrics.trainingTime}ms</span>
                        </div>
                        {result.prediction.processingTime !== undefined && (
                          <div className="metric">
                            <span>预测时间</span>
                            <span>{result.prediction.processingTime}ms</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="reasoning">
                      <h5>推理过程</h5>
                      <ul>
                        {result.prediction.reasoning.map((reason: string, index: number) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelComparison;