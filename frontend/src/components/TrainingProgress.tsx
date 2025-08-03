import React, { useState, useEffect } from 'react';
import './styles.css';

interface TrainingMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingSamples: number;
  realSamples: number;
  fakeSamples: number;
}

interface TrainingProgressProps {
  onTrainingComplete: (metrics: TrainingMetrics) => void;
  onStartTesting: () => void;
}

export const TrainingProgress: React.FC<TrainingProgressProps> = ({ 
  onTrainingComplete, 
  onStartTesting 
}) => {
  const [trainingStatus, setTrainingStatus] = useState<{
    status: 'idle' | 'training' | 'completed' | 'error';
    progress: number;
    message: string;
    metrics: TrainingMetrics | null;
    isModelTrained: boolean;
  }>({
    status: 'idle',
    progress: 0,
    message: '',
    metrics: null,
    isModelTrained: false
  });

  const [isPolling, setIsPolling] = useState(false);

  // 检查训练状态
  const checkTrainingStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ml/training/status');
      const data = await response.json();
      
      if (data.success) {
        setTrainingStatus(data.data);
        
        if (data.data.status === 'completed' && data.data.metrics) {
          onTrainingComplete(data.data.metrics);
          setIsPolling(false);
        } else if (data.data.status === 'error') {
          setIsPolling(false);
        }
      }
    } catch (error) {
      console.error('检查训练状态失败:', error);
    }
  };

  // 开始训练
  const startTraining = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ml/training/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setIsPolling(true);
      } else {
        alert(`训练启动失败: ${data.message}`);
      }
    } catch (error) {
      console.error('启动训练失败:', error);
      alert('训练启动失败，请检查网络连接');
    }
  };

  // 重置模型
  const resetModel = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ml/reset', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        await checkTrainingStatus();
      } else {
        alert(`重置失败: ${data.message}`);
      }
    } catch (error) {
      console.error('重置模型失败:', error);
    }
  };

  // 轮询训练状态
  useEffect(() => {
    checkTrainingStatus(); // 初始检查

    let interval: NodeJS.Timeout;
    if (isPolling) {
      interval = setInterval(checkTrainingStatus, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPolling]);

  const getStatusIcon = () => {
    switch (trainingStatus.status) {
      case 'idle':
        return '🤖';
      case 'training':
        return '⚡';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '🤖';
    }
  };

  const getStatusColor = () => {
    switch (trainingStatus.status) {
      case 'training':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="training-progress">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">训练AI模型</h2>
        <p className="text-gray-600">使用收集的数据训练标题党识别模型</p>
      </div>

      <div className="training-card">
        <div className="training-header">
          <div className="status-icon">{getStatusIcon()}</div>
          <div className="status-text">
            <h3 className={`status-title ${getStatusColor()}`}>
              {trainingStatus.status === 'idle' && '准备开始训练'}
              {trainingStatus.status === 'training' && '正在训练模型...'}
              {trainingStatus.status === 'completed' && '训练完成'}
              {trainingStatus.status === 'error' && '训练失败'}
            </h3>
            {trainingStatus.message && (
              <p className="status-message">{trainingStatus.message}</p>
            )}
          </div>
        </div>

        {trainingStatus.status === 'training' && (
          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${trainingStatus.progress}%` }}
              />
            </div>
            <div className="progress-text">
              {trainingStatus.progress}% 完成
            </div>
          </div>
        )}

        {trainingStatus.metrics && trainingStatus.status === 'completed' && (
          <div className="metrics-section">
            <h4 className="metrics-title">模型性能指标</h4>
            <div className="metrics-grid">
              <div className="metric-item">
                <div className="metric-value">{trainingStatus.metrics.accuracy}%</div>
                <div className="metric-label">准确率</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{trainingStatus.metrics.precision}%</div>
                <div className="metric-label">精确率</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{trainingStatus.metrics.recall}%</div>
                <div className="metric-label">召回率</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{trainingStatus.metrics.f1Score}%</div>
                <div className="metric-label">F1分数</div>
              </div>
            </div>
            <div className="training-info">
              <p>训练样本: {trainingStatus.metrics.trainingSamples} 条</p>
              <p>正常标题: {trainingStatus.metrics.realSamples} 条 | 标题党: {trainingStatus.metrics.fakeSamples} 条</p>
            </div>
          </div>
        )}

        <div className="training-actions">
          {trainingStatus.status === 'idle' && (
            <button
              onClick={startTraining}
              className="action-button primary"
            >
              开始训练模型
            </button>
          )}

          {trainingStatus.status === 'training' && (
            <div className="training-spinner">
              <div className="spinner"></div>
              <span>模型训练中，请稍候...</span>
            </div>
          )}

          {trainingStatus.status === 'completed' && (
            <div className="completed-actions">
              <button
                onClick={onStartTesting}
                className="action-button primary"
              >
                开始测试模型
              </button>
              <button
                onClick={resetModel}
                className="action-button secondary"
              >
                重新训练
              </button>
            </div>
          )}

          {trainingStatus.status === 'error' && (
            <div className="error-actions">
              <p className="error-message">
                训练过程中出现错误，请检查训练数据后重试
              </p>
              <button
                onClick={startTraining}
                className="action-button primary"
              >
                重试训练
              </button>
            </div>
          )}
        </div>
      </div>

      {!trainingStatus.isModelTrained && trainingStatus.status === 'idle' && (
        <div className="training-tips">
          <h4 className="tips-title">💡 训练提示</h4>
          <ul className="tips-list">
            <li>确保已添加足够的正常标题和标题党样本（各至少3条）</li>
            <li>样本质量越高，模型效果越好</li>
            <li>训练过程通常需要几秒钟时间</li>
            <li>训练完成后可以立即测试模型效果</li>
          </ul>
        </div>
      )}
    </div>
  );
};