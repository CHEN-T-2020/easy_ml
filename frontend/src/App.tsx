import React, { useState } from 'react';
import { ProgressBar } from './components/ProgressBar';
import { TextInput } from './components/TextInput';
import { SampleList } from './components/SampleList';
import { FileUpload } from './components/FileUpload';
import { TrainingProgress } from './components/TrainingProgress';
import { TestingInterface } from './components/TestingInterface';
import { api } from './utils/api';

interface TextSample {
  id: number;
  content: string;
  label: 'real' | 'fake';
}

// 示例数据用于快速试用
const SAMPLE_DATA = {
  real: [
    // 政务新闻
    "教育部发布2024年高校招生政策调整通知",
    "国家统计局：前三季度GDP同比增长5.2%",
    "生态环境部通报全国空气质量状况",
    "央行宣布下调存款准备金率0.25个百分点",
    
    // 民生新闻  
    "本市今日气温将达到35℃，市民需注意防暑降温",
    "地铁2号线因设备故障延误10分钟，现已恢复正常",
    "社区卫生服务中心新增儿科诊疗项目",
    "本周末部分路段将进行道路维修，请注意绕行",
    
    // 科技财经
    "某科技公司第三季度财报显示营收增长15%",
    "新能源汽车销量连续三个月保持增长",
    "5G网络覆盖率已达到全国85%以上地区",
    "人工智能技术在医疗诊断领域应用取得突破",
    
    // 社会新闻
    "新冠疫苗接种点本周末正常开放",
    "城市地铁2号线预计明年6月开通运营",
    "图书馆将于下月推出24小时自助借阅服务",
    "学校食堂实施营养餐计划，改善学生饮食质量"
  ],
  fake: [
    // 健康谣言类
    "震惊！这个方法让你30天暴瘦20斤，不看后悔一辈子！",
    "太可怕了！这种食物吃一口等于吃10根香烟，赶紧告诉家人",
    "医生都不敢说的秘密！每天吃这个，癌症永远不找你",
    "惊呆了！原来感冒不用吃药，用这招3天就好",
    
    // 财富诱惑类
    "速看！银行内部消息泄露，这样存钱一年多赚10万",
    "不敢相信！这个副业让我月入过万，在家就能做",
    "绝密！马云都在用的赚钱方法，普通人也能学会",
    "重磅！国家发钱了，每人可领5000元，速度申请",
    
    // 娱乐八卦类
    "重磅消息！某明星秘密结婚生子，真相让人不敢相信",
    "炸了！这位女星整容前后差距太大，网友直呼认不出",
    "独家爆料！某导演潜规则内幕，整个娱乐圈都震惊了",
    "火爆全网！这个明星私生活太乱，粉丝纷纷脱粉",
    
    // 恐慌传播类
    "必须转发！这个东西家家都有，竟然致癌率高达90%",
    "紧急通知！这种洗发水有毒，用了会脱发变秃头",
    "警告！手机这样充电会爆炸，已有多人受伤",
    "千万别买！这些牌子的食品全是假货，吃了会中毒"
  ]
};

function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [realNewsText, setRealNewsText] = useState('');
  const [fakeNewsText, setFakeNewsText] = useState('');
  const [samples, setSamples] = useState<TextSample[]>([]);

  const steps = ['收集数据', '训练模型', '测试识别'];

  const addSample = async (content: string, label: 'real' | 'fake') => {
    if (content.length < 10) return;
    
    try {
      const response = await api.addSample(content, label);
      if (response.success && response.data) {
        const newSample: TextSample = {
          id: response.data.id,
          content: response.data.content,
          label: response.data.label
        };
        
        setSamples([...samples, newSample]);
        
        if (label === 'real') {
          setRealNewsText('');
        } else {
          setFakeNewsText('');
        }
      }
    } catch (error) {
      console.error('添加样本失败:', error);
    }
  };

  const handleBatchUpload = async (texts: string[], label: 'real' | 'fake') => {
    try {
      const response = await api.batchUpload(texts, label);
      if (response.success && response.data) {
        const newSamples: TextSample[] = response.data.samples.map(sample => ({
          id: sample.id,
          content: sample.content,
          label: sample.label
        }));
        
        setSamples(prevSamples => [...prevSamples, ...newSamples]);
      }
    } catch (error) {
      console.error('批量上传失败:', error);
    }
  };

  const deleteSample = async (id: number) => {
    try {
      const response = await api.deleteSample(id);
      if (response.success) {
        setSamples(samples.filter(sample => sample.id !== id));
      }
    } catch (error) {
      console.error('删除样本失败:', error);
    }
  };

  // 快速试用功能：加载示例数据
  const loadSampleData = async () => {
    try {
      // 加载正常标题
      const realResponse = await api.batchUpload(SAMPLE_DATA.real, 'real');
      if (realResponse.success && realResponse.data) {
        const realSamples: TextSample[] = realResponse.data.samples.map(sample => ({
          id: sample.id,
          content: sample.content,
          label: sample.label
        }));
        
        // 加载标题党
        const fakeResponse = await api.batchUpload(SAMPLE_DATA.fake, 'fake');
        if (fakeResponse.success && fakeResponse.data) {
          const fakeSamples: TextSample[] = fakeResponse.data.samples.map(sample => ({
            id: sample.id,
            content: sample.content,
            label: sample.label
          }));
          
          // 更新状态
          setSamples(prevSamples => [...prevSamples, ...realSamples, ...fakeSamples]);
          
          // 显示成功提示
          alert(`成功加载示例数据：${realSamples.length} 条正常标题，${fakeSamples.length} 条标题党`);
        }
      }
    } catch (error) {
      console.error('加载示例数据失败:', error);
      alert('加载示例数据失败，请稍后重试');
    }
  };

  const realSamples = samples.filter(s => s.label === 'real');
  const fakeSamples = samples.filter(s => s.label === 'fake');

  const canProceed = realSamples.length >= 3 && fakeSamples.length >= 3;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">标题党识别训练平台</h1>
          <p className="text-gray-600">学习识别诱导性标题，培养媒体素养</p>
        </header>

        <ProgressBar 
          currentStep={currentStep} 
          totalSteps={3} 
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
            {samples.length === 0 && (
              <div className="quick-demo-card">
                <div className="demo-header">
                  <div className="demo-icon">🚀</div>
                  <div className="demo-content">
                    <h3 className="demo-title">快速试用</h3>
                    <p className="demo-description">
                      不想手动输入数据？点击下方按钮加载示例数据，立即体验完整功能
                    </p>
                  </div>
                </div>
                <button
                  onClick={loadSampleData}
                  className="demo-button"
                >
                  <span className="button-icon">⚡</span>
                  加载示例数据 (16条正常标题 + 16条标题党)
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <TextInput
                  label="正常标题"
                  placeholder="请输入正常、客观的标题内容..."
                  value={realNewsText}
                  onChange={setRealNewsText}
                  onAdd={() => addSample(realNewsText, 'real')}
                  labelColor="green"
                />
                
                <FileUpload
                  label="real"
                  onFilesUploaded={(texts) => handleBatchUpload(texts, 'real')}
                />
                
                <SampleList
                  samples={realSamples}
                  label="real"
                  onDelete={deleteSample}
                />
              </div>

              <div>
                <TextInput
                  label="标题党"
                  placeholder="请输入夸张、诱导性的标题内容..."
                  value={fakeNewsText}
                  onChange={setFakeNewsText}
                  onAdd={() => addSample(fakeNewsText, 'fake')}
                  labelColor="red"
                />
                
                <FileUpload
                  label="fake"
                  onFilesUploaded={(texts) => handleBatchUpload(texts, 'fake')}
                />
                
                <SampleList
                  samples={fakeSamples}
                  label="fake"
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
                  当前样本: {realSamples.length} 条正常标题, {fakeSamples.length} 条标题党
                </p>
                {!canProceed && (
                  <p className="text-sm text-amber-600">
                    建议至少添加 {Math.max(0, 3 - realSamples.length)} 条正常标题和 {Math.max(0, 3 - fakeSamples.length)} 条标题党以获得更好的训练效果
                  </p>
                )}
              </div>
              <button
                onClick={() => setCurrentStep(1)}
                className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                下一步：训练模型
              </button>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <TrainingProgress
            onTrainingComplete={(metrics) => {
              console.log('训练完成:', metrics);
              // 可以选择自动进入下一步或停留在当前步骤
            }}
            onStartTesting={() => {
              setCurrentStep(2);
            }}
            realSamplesCount={realSamples.length}
            fakeSamplesCount={fakeSamples.length}
            onGoToDataCollection={() => {
              setCurrentStep(0);
            }}
          />
        )}

        {currentStep === 2 && (
          <TestingInterface
            onBackToTraining={() => {
              setCurrentStep(1);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default App;
