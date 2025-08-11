import React, { useState, useEffect } from 'react';
import { ProgressBar } from './components/ProgressBar';
import { TextInput } from './components/TextInput';
import { SampleList } from './components/SampleList';
import { FileUpload } from './components/FileUpload';
import ModelComparison from './components/ModelComparison';
import { api } from './utils/api';
import { stateManager } from './utils/stateManager';
import { DataProvider, useDataContext } from './contexts/DataContext';

interface TextSample {
  id: number;
  content: string;
  label: 'normal' | 'clickbait';
}


function AppContent() {
  // 使用全局数据上下文
  const { triggerDataChange, updateSampleCount } = useDataContext();
  
  // 从localStorage恢复状态
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem('app_currentStep');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [normalNewsText, setNormalNewsText] = useState(() => {
    return localStorage.getItem('app_normalNewsText') || '';
  });
  const [clickbaitNewsText, setClickbaitNewsText] = useState(() => {
    return localStorage.getItem('app_clickbaitNewsText') || '';
  });
  const [samples, setSamples] = useState<TextSample[]>([]);

  const steps = ['收集数据', '模型对比'];

  // 保存状态到localStorage
  const saveStateToStorage = () => {
    localStorage.setItem('app_currentStep', currentStep.toString());
    localStorage.setItem('app_normalNewsText', normalNewsText);
    localStorage.setItem('app_clickbaitNewsText', clickbaitNewsText);
  };

  // 监听状态变化并保存
  useEffect(() => {
    saveStateToStorage();
  }, [currentStep, normalNewsText, clickbaitNewsText, saveStateToStorage]);

  // 清除所有保存的状态和数据（重置功能）
  const clearAllSavedState = async () => {
    try {
      // 1. 清除localStorage状态
      const keys = [
        'app_currentStep', 'app_normalNewsText', 'app_clickbaitNewsText'
      ];
      keys.forEach(key => localStorage.removeItem(key));
      
      // 2. 使用状态管理器清空对比状态
      stateManager.clearState();
      
      // 3. 清除后端数据和模型
      const clearPromises = [
        // 清除所有文本样本数据
        api.clearAllSamples(),
        // 重置模型对比
        api.modelComparison.resetModels()
      ];
      
      await Promise.allSettled(clearPromises);
      console.log('所有数据和状态已清除');
      
    } catch (error) {
      console.error('清除数据时出错:', error);
      // 即使出错也继续重置前端状态
    }
  };

  // 获取当前样本数据
  const fetchSamples = async () => {
    try {
      const response = await api.getSamples();
      if (response.success && response.data) {
        const fetchedSamples: TextSample[] = response.data.map(sample => ({
          id: sample.id,
          content: sample.content,
          label: sample.label
        }));
        setSamples(fetchedSamples);
        
        // 🆕 更新全局样本数量
        updateSampleCount(fetchedSamples.length);
        console.log('📊 更新全局样本数量:', fetchedSamples.length);
      }
    } catch (error) {
      console.error('获取样本失败:', error);
    }
  };

  // 在组件挂载和步骤切换时获取样本数据
  useEffect(() => {
    fetchSamples();
  }, [currentStep]);

  const addSample = async (content: string, label: 'normal' | 'clickbait') => {
    if (content.length < 10) return;
    
    try {
      const response = await api.addSample(content, label);
      if (response.success && response.data) {
        // 重新获取最新的样本数据
        await fetchSamples();
        
        // 🆕 触发全局数据变更事件
        triggerDataChange('SAMPLE_ADDED', { sample: response.data, label });
        
        if (label === 'normal') {
          setNormalNewsText('');
        } else {
          setClickbaitNewsText('');
        }
      }
    } catch (error) {
      console.error('添加样本失败:', error);
    }
  };

  const handleBatchUpload = async (texts: string[], label: 'normal' | 'clickbait') => {
    try {
      const response = await api.batchUpload(texts, label);
      if (response.success && response.data) {
        // 重新获取最新的样本数据
        await fetchSamples();
      }
    } catch (error) {
      console.error('批量上传失败:', error);
    }
  };

  const deleteSample = async (id: number) => {
    try {
      const response = await api.deleteSample(id);
      if (response.success) {
        // 重新获取最新的样本数据
        await fetchSamples();
        
        // 🆕 触发全局数据变更事件
        triggerDataChange('SAMPLE_DELETED', { sampleId: id });
      }
    } catch (error) {
      console.error('删除样本失败:', error);
    }
  };

  // 快速试用功能：加载100条训练数据
  const loadSampleData = async () => {
    try {
      // 首先获取训练数据集信息
      const datasetInfo = await api.dataManager.getTrainingDataset();
      if (!datasetInfo.success || !datasetInfo.data) {
        alert('训练数据集不存在，请检查系统配置');
        return;
      }

      // 导入训练数据集到系统
      const importResponse = await api.dataManager.importTrainingDataset();
      if (importResponse.success && importResponse.data) {
        // 重新获取最新的样本数据
        await fetchSamples();
        
        // 显示成功提示
        alert(`成功加载训练数据集：${importResponse.data.normalCount} 条正常标题，${importResponse.data.clickbaitCount} 条标题党 (共${importResponse.data.importedCount}条)`);
      }
    } catch (error) {
      console.error('加载训练数据失败:', error);
      alert('加载训练数据失败，请稍后重试');
    }
  };

  const normalSamples = samples.filter(s => s.label === 'normal');
  const clickbaitSamples = samples.filter(s => s.label === 'clickbait');

  const canProceed = normalSamples.length >= 3 && clickbaitSamples.length >= 3;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="text-center mb-8">
          <div className="flex justify-between items-start mb-4">
            <div></div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">标题党识别训练平台</h1>
              <p className="text-gray-600">学习识别诱导性标题，培养媒体素养</p>
            </div>
            <button
              onClick={async () => {
                if (window.confirm('确定要重置所有数据和进度吗？这将清除：\n• 所有文本样本数据\n• 模型对比结果\n• 页面状态\n\n此操作不可撤销！')) {
                  try {
                    // 显示加载状态
                    if (document.activeElement) {
                      (document.activeElement as HTMLElement).textContent = '重置中...';
                    }
                    
                    await clearAllSavedState();
                    
                    // 重置完成后刷新页面
                    window.location.reload();
                  } catch (error) {
                    console.error('重置失败:', error);
                    alert('重置过程中出现错误，请手动刷新页面');
                    window.location.reload();
                  }
                }
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline hover:text-red-600 transition-colors"
              title="重置所有数据和状态"
            >
              重置
            </button>
          </div>
        </header>

        <ProgressBar 
          currentStep={currentStep} 
          totalSteps={2} 
          steps={steps} 
          onStepClick={setCurrentStep}
        />

        {currentStep === 0 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">收集训练数据</h2>
              <p className="text-gray-600">请添加正常标题和标题党的文本样本，至少各3条</p>
            </div>

            {/* 快速试用功能 */}
            {samples.length < 50 && (
              <div className="quick-demo-card">
                <div className="demo-header">
                  <div className="demo-icon">🚀</div>
                  <div className="demo-content">
                    <h3 className="demo-title">快速试用</h3>
                    <p className="demo-description">
                      不想手动输入数据？点击下方按钮加载100条专业训练数据集，立即体验完整功能
                    </p>
                  </div>
                </div>
                <button
                  onClick={loadSampleData}
                  className="demo-button"
                >
                  <span className="button-icon">⚡</span>
                  加载训练数据集 (50条正常标题 + 50条标题党)
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <TextInput
                  label="正常标题"
                  placeholder="请输入正常、客观的标题内容..."
                  value={normalNewsText}
                  onChange={setNormalNewsText}
                  onAdd={() => addSample(normalNewsText, 'normal')}
                  labelColor="green"
                />
                
                <FileUpload
                  label="normal"
                  onFilesUploaded={(texts) => handleBatchUpload(texts, 'normal')}
                />
                
                <SampleList
                  samples={normalSamples}
                  label="normal"
                  onDelete={deleteSample}
                />
              </div>

              <div>
                <TextInput
                  label="标题党"
                  placeholder="请输入夸张、诱导性的标题内容..."
                  value={clickbaitNewsText}
                  onChange={setClickbaitNewsText}
                  onAdd={() => addSample(clickbaitNewsText, 'clickbait')}
                  labelColor="red"
                />
                
                <FileUpload
                  label="clickbait"
                  onFilesUploaded={(texts) => handleBatchUpload(texts, 'clickbait')}
                />
                
                <SampleList
                  samples={clickbaitSamples}
                  label="clickbait"
                  onDelete={deleteSample}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">💡 提示</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 正常标题通常客观陈述，用词准确，不过度渲染</li>
                <li>• 标题党常含夸张词汇，情绪化表达，诱导点击</li>
                <li>• 建议每类至少添加5-10个样本以获得更好的训练效果</li>
              </ul>
            </div>

            <div className="text-center">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  当前样本: {normalSamples.length} 条正常标题, {clickbaitSamples.length} 条标题党
                </p>
                {!canProceed && (
                  <p className="text-sm text-amber-600">
                    建议至少添加 {Math.max(0, 3 - normalSamples.length)} 条正常标题和 {Math.max(0, 3 - clickbaitSamples.length)} 条标题党以获得更好的训练效果
                  </p>
                )}
              </div>
              <button
                onClick={() => setCurrentStep(1)}
                className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                下一步：模型对比
              </button>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">模型对比分析</h2>
              <p className="text-gray-600">比较不同机器学习模型的性能表现</p>
            </div>
            
            <ModelComparison />
            
            <div className="text-center mt-8">
              <button
                onClick={() => setCurrentStep(0)}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                返回数据收集
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 包装App组件，提供全局数据上下文
function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

export default App;
