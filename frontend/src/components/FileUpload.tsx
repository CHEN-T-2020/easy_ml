import React, { useState, useRef } from 'react';
import './styles.css';

interface FileUploadProps {
  label: 'real' | 'fake';
  onFilesUploaded: (texts: string[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, onFilesUploaded }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isReal = label === 'real';
  const labelText = isReal ? '真实新闻' : '假新闻';

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.txt')) {
      throw new Error('只支持.txt格式的文件');
    }

    const text = await file.text();
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      throw new Error('文件内容为空');
    }

    return lines;
  };

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;

    setUploadStatus('uploading');
    setUploadMessage('正在处理文件...');

    try {
      const allTexts: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const texts = await processFile(file);
        allTexts.push(...texts);
      }

      onFilesUploaded(allTexts);
      setUploadStatus('success');
      setUploadMessage(`成功导入 ${allTexts.length} 条${labelText}样本`);

      // 3秒后重置状态
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadMessage('');
      }, 3000);

    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error instanceof Error ? error.message : '文件处理失败');

      setTimeout(() => {
        setUploadStatus('idle');
        setUploadMessage('');
      }, 3000);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`file-upload-container ${isReal ? 'real' : 'fake'}`}>
      <div
        className={`file-upload-area ${isDragOver ? 'drag-over' : ''} ${uploadStatus}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          multiple
          onChange={handleFileInputChange}
          className="file-input-hidden"
        />

        <div className="file-upload-content">
          {uploadStatus === 'idle' && (
            <>
              <div className="upload-icon">📁</div>
              <p className="upload-text">
                点击选择或拖拽{labelText}TXT文件到此处
              </p>
              <p className="upload-hint">
                支持多文件上传，每行一条样本
              </p>
            </>
          )}

          {uploadStatus === 'uploading' && (
            <>
              <div className="upload-icon spinning">⏳</div>
              <p className="upload-text">{uploadMessage}</p>
            </>
          )}

          {uploadStatus === 'success' && (
            <>
              <div className="upload-icon">✅</div>
              <p className="upload-text success">{uploadMessage}</p>
            </>
          )}

          {uploadStatus === 'error' && (
            <>
              <div className="upload-icon">❌</div>
              <p className="upload-text error">{uploadMessage}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};