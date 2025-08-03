import React, { useState } from 'react';
import './styles.css';

interface PredictionResult {
  text: string;
  prediction: 'real' | 'fake';
  confidence: number;
  reasoning: string[];
  features: {
    length: number;
    wordCount: number;
    exclamationCount: number;
    questionCount: number;
    clickbaitWords: number;
    urgencyWords: number;
    emotionalWords: number;
  };
}

interface TestingInterfaceProps {
  onBackToTraining: () => void;
}

export const TestingInterface: React.FC<TestingInterfaceProps> = ({ onBackToTraining }) => {
  const [testText, setTestText] = useState('');
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testHistory, setTestHistory] = useState<PredictionResult[]>([]);

  const handlePredict = async () => {
    if (!testText.trim() || testText.length < 10) {
      alert('请输入至少10个字符的标题');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/ml/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: testText.trim() }),
      });

      const data = await response.json();
      
      if (data.success) {
        const result: PredictionResult = data.data;
        setPrediction(result);
        setTestHistory(prev => [result, ...prev.slice(0, 4)]); // 保留最近5次测试
      } else {
        alert(`预测失败: ${data.message}`);
      }
    } catch (error) {
      console.error('预测失败:', error);
      alert('预测失败，请检查网络连接和模型状态');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setTestText('');
    setPrediction(null);
  };

  const clearHistory = () => {
    setTestHistory([]);
  };

  const getResultColor = (prediction: string) => {
    return prediction === 'real' ? 'real' : 'fake';
  };

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 80) return '很高';
    if (confidence >= 60) return '较高';
    if (confidence >= 40) return '中等';
    return '较低';
  };

  return (
    <div className="testing-interface">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">测试标题党识别</h2>
        <p className="text-gray-600">输入标题文本，AI模型将判断是否为标题党</p>
      </div>

      <div className="test-input-section">
        <div className="test-input-card">
          <label className="test-input-label">
            测试标题
          </label>
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="test-textarea"
            placeholder="请输入要测试的标题内容..."
            rows={3}
            maxLength={200}
          />
          <div className="test-input-footer">
            <span className="char-count">{testText.length}/200 字符</span>
            <div className="test-actions">
              <button
                onClick={handleClear}
                className="action-button secondary"
                disabled={!testText}
              >
                清空
              </button>
              <button
                onClick={handlePredict}
                className="action-button primary"
                disabled={isLoading || testText.length < 10}
              >
                {isLoading ? '分析中...' : '开始分析'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {prediction && (
        <div className="prediction-result">
          <div className={`result-card ${getResultColor(prediction.prediction)}`}>
            <div className="result-header">
              <div className="result-icon">
                {prediction.prediction === 'real' ? '✅' : '⚠️'}
              </div>
              <div className="result-main">
                <h3 className={`result-title ${getResultColor(prediction.prediction)}`}>
                  {prediction.prediction === 'real' ? '正常标题' : '标题党'}
                </h3>
                <p className="result-confidence">
                  置信度: {prediction.confidence}% ({getConfidenceLevel(prediction.confidence)})
                </p>
              </div>
            </div>

            <div className="result-details">
              <div className="features-section">
                <h4 className="features-title">文本特征分析</h4>
                <div className="features-grid">
                  <div className="feature-item">
                    <span className="feature-label">文本长度:</span>
                    <span className="feature-value">{prediction.features.length}</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-label">词汇数量:</span>
                    <span className="feature-value">{prediction.features.wordCount}</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-label">感叹号:</span>
                    <span className="feature-value">{prediction.features.exclamationCount}</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-label">问号:</span>
                    <span className="feature-value">{prediction.features.questionCount}</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-label">标题党词汇:</span>
                    <span className="feature-value">{prediction.features.clickbaitWords}</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-label">紧迫性词汇:</span>
                    <span className="feature-value">{prediction.features.urgencyWords}</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-label">情感词汇:</span>
                    <span className="feature-value">{prediction.features.emotionalWords}</span>
                  </div>
                </div>
              </div>

              {prediction.reasoning.length > 0 && (
                <div className="reasoning-section">
                  <h4 className="reasoning-title">分析依据</h4>
                  <ul className="reasoning-list">
                    {prediction.reasoning.map((reason, index) => (
                      <li key={index} className="reasoning-item">
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {testHistory.length > 0 && (
        <div className="test-history">
          <div className="history-header">
            <h4 className="history-title">测试历史</h4>
            <button onClick={clearHistory} className="clear-history-button">
              清空历史
            </button>
          </div>
          <div className="history-list">
            {testHistory.map((result, index) => (
              <div key={index} className={`history-item ${getResultColor(result.prediction)}`}>
                <div className="history-content">
                  <div className="history-text">{result.text}</div>
                  <div className="history-result">
                    <span className={`history-label ${getResultColor(result.prediction)}`}>
                      {result.prediction === 'real' ? '正常' : '标题党'}
                    </span>
                    <span className="history-confidence">{result.confidence}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="testing-actions">
        <button
          onClick={onBackToTraining}
          className="action-button secondary"
        >
          返回训练
        </button>
        <button
          onClick={() => window.location.reload()}
          className="action-button primary"
        >
          重新开始
        </button>
      </div>

      <div className="navigation-tip">
        <p className="text-sm text-gray-600 text-center mb-4">
          💡 提示：可以点击上方的步骤切换到其他功能页面
        </p>
      </div>

      <div className="testing-tips">
        <h4 className="tips-title">💡 使用提示</h4>
        <ul className="tips-list">
          <li>输入各种类型的标题来测试模型的识别能力</li>
          <li>观察特征分析结果，了解模型的判断依据</li>
          <li>置信度反映模型对判断结果的确信程度</li>
          <li>如果预测结果不准确，可以点击上方"收集数据"添加更多样本</li>
        </ul>
      </div>
    </div>
  );
};