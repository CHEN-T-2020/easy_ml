import React, { useState } from 'react';
import { SampleCard } from './SampleCard';
import './styles.css';

interface TextSample {
  id: number;
  content: string;
  label: 'real' | 'fake';
}

interface SampleListProps {
  samples: TextSample[];
  label: 'real' | 'fake';
  onDelete: (id: number) => void;
}

export const SampleList: React.FC<SampleListProps> = ({ samples, label, onDelete }) => {
  const [showAll, setShowAll] = useState(false);
  
  const isReal = label === 'real';
  const labelText = isReal ? '正常标题' : '标题党';
  
  // 按ID降序排列，显示最新添加的在前面
  const sortedSamples = [...samples].sort((a, b) => b.id - a.id);
  
  // 决定显示哪些样本
  const displaySamples = showAll ? sortedSamples : sortedSamples.slice(0, 3);
  const hiddenCount = sortedSamples.length - displaySamples.length;

  return (
    <div className="sample-list">
      <div className="sample-list-header">
        <h4 className="sample-list-title">
          已添加的{labelText} ({samples.length})
        </h4>
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className={`toggle-button ${isReal ? 'real' : 'fake'}`}
          >
            {showAll ? '收起' : `显示全部 (+${hiddenCount})`}
          </button>
        )}
      </div>

      <div className="sample-list-content">
        {displaySamples.map((sample, index) => (
          <SampleCard
            key={sample.id}
            content={sample.content}
            label={sample.label}
            index={sortedSamples.indexOf(sample)}
            onDelete={() => onDelete(sample.id)}
          />
        ))}

        {samples.length === 0 && (
          <div className="empty-state">
            <p className="empty-text">还没有添加{labelText}样本</p>
            <p className="empty-hint">使用上方输入框或文件上传来添加样本</p>
          </div>
        )}
      </div>

      {showAll && hiddenCount === 0 && samples.length > 3 && (
        <div className="sample-list-footer">
          <button
            onClick={() => setShowAll(false)}
            className={`collapse-button ${isReal ? 'real' : 'fake'}`}
          >
            收起列表
          </button>
        </div>
      )}
    </div>
  );
};