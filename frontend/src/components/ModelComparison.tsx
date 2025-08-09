import React, { useState, useEffect } from 'react';
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
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingTime: number;
}

interface ClassificationResult {
  prediction: 'real' | 'fake';
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
    prediction: 'real' | 'fake';
    confidence: number;
    agreement: number;
  };
}

const ModelComparison: React.FC = () => {
  const [models, setModels] = useState<{[key: string]: ModelInfo}>(() => {
    const saved = localStorage.getItem('comparison_models');
    return saved ? JSON.parse(saved) : {};
  });
  const [comparisonResults, setComparisonResults] = useState<ModelComparisonResult[]>(() => {
    const saved = localStorage.getItem('comparison_results');
    return saved ? JSON.parse(saved) : [];
  });
  const [summary, setSummary] = useState<ComparisonSummary | null>(() => {
    const saved = localStorage.getItem('comparison_summary');
    return saved ? JSON.parse(saved) : null;
  });
  const [testText, setTestText] = useState(() => {
    return localStorage.getItem('comparison_testText') || '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState<{[key: string]: boolean}>(() => {
    const saved = localStorage.getItem('comparison_trainingStatus');
    return saved ? JSON.parse(saved) : {};
  });

  // 保存状态到localStorage
  useEffect(() => {
    localStorage.setItem('comparison_models', JSON.stringify(models));
  }, [models]);

  useEffect(() => {
    localStorage.setItem('comparison_results', JSON.stringify(comparisonResults));
  }, [comparisonResults]);

  useEffect(() => {
    localStorage.setItem('comparison_summary', JSON.stringify(summary));
  }, [summary]);

  useEffect(() => {
    localStorage.setItem('comparison_testText', testText);
  }, [testText]);

  useEffect(() => {
    localStorage.setItem('comparison_trainingStatus', JSON.stringify(trainingStatus));
  }, [trainingStatus]);

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
        setComparisonResults([]);
        setSummary(null);
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
                  {info.advantages.slice(0, 2).map((advantage, index) => (
                    <li key={index}>{advantage}</li>
                  ))}
                </ul>
              </div>
              
              <div className="disadvantages">
                <h4>❌ 劣势</h4>
                <ul>
                  {info.disadvantages.slice(0, 2).map((disadvantage, index) => (
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
                        {result.prediction.prediction === 'fake' ? '标题党' : '正常标题'}
                      </div>
                      <div className="confidence">
                        置信度: {result.prediction.confidence}%
                      </div>
                    </div>
                    
                    <div className="metrics">
                      <div className="metric">
                        <span>准确率</span>
                        <span>{(result.metrics.accuracy * 100).toFixed(1)}%</span>
                      </div>
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
                    
                    <div className="reasoning">
                      <h5>推理过程</h5>
                      <ul>
                        {result.prediction.reasoning.map((reason, index) => (
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