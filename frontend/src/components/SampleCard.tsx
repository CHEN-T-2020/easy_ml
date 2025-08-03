import React from 'react';
import './styles.css';

interface SampleCardProps {
  content: string;
  label: 'real' | 'fake';
  onDelete: () => void;
  index: number;
}

export const SampleCard: React.FC<SampleCardProps> = ({ content, label, onDelete, index }) => {
  const isReal = label === 'real';

  return (
    <div className={`sample-card ${isReal ? 'real' : 'fake'}`}>
      <div className="sample-header">
        <span className={`sample-label ${isReal ? 'real' : 'fake'}`}>
          {isReal ? '正常标题' : '标题党'} #{index + 1}
        </span>
        <button
          onClick={onDelete}
          className="delete-button"
        >
          ✕
        </button>
      </div>
      <p className="sample-content">
        {content.length > 100 ? `${content.substring(0, 100)}...` : content}
      </p>
      <div className="sample-meta">
        {content.length} 字符
      </div>
    </div>
  );
};