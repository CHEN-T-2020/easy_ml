import React from 'react';
import './styles.css';

interface TextInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  className?: string;
  labelColor?: 'green' | 'red';
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  onAdd,
  className = '',
  labelColor = 'green'
}) => {
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);
  };

  return (
    <div className={`text-input-card ${className}`}>
      <div className="text-input-header">
        <h3 className={`text-input-label ${labelColor === 'green' ? 'label-green' : 'label-red'}`}>{label}</h3>
        <span className="char-count">{value.length} 字符</span>
      </div>
      
      <textarea
        value={value}
        onChange={handleTextChange}
        placeholder={placeholder}
        className="text-input-textarea"
        maxLength={1000}
      />
      
      <div className="text-input-footer">
        <div className="quality-score">
          质量评分: {value.length > 50 ? '良好' : value.length > 20 ? '一般' : '需要更多内容'}
        </div>
        <button
          onClick={onAdd}
          disabled={value.length < 10}
          className="add-button"
        >
          添加样本
        </button>
      </div>
    </div>
  );
};