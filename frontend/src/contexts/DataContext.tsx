import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// 全局数据状态接口
interface DataState {
  sampleCount: number;
  lastUpdated: number;
  version: number; // 用于强制组件更新
}

// 事件类型
export type DataChangeEvent = 'SAMPLE_ADDED' | 'SAMPLE_DELETED' | 'SAMPLES_CLEARED' | 'SAMPLES_BATCH_ADDED';

// Context接口
interface DataContextType {
  // 数据状态
  sampleCount: number;
  lastUpdated: number;
  version: number;
  
  // 方法
  updateSampleCount: (count: number) => void;
  triggerDataChange: (event: DataChangeEvent, data?: any) => void;
  refreshData: () => void;
  
  // 监听器管理
  addListener: (listener: DataChangeListener) => () => void;
}

// 数据变更监听器类型
export type DataChangeListener = (event: DataChangeEvent, data?: any) => void;

const DataContext = createContext<DataContextType | undefined>(undefined);

// 全局监听器集合
const globalListeners = new Set<DataChangeListener>();

// Provider组件
export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DataState>({
    sampleCount: 0,
    lastUpdated: Date.now(),
    version: 0
  });

  // 更新样本数量
  const updateSampleCount = useCallback((count: number) => {
    setState(prev => ({
      ...prev,
      sampleCount: count,
      lastUpdated: Date.now(),
      version: prev.version + 1
    }));
  }, []);

  // 触发数据变更事件
  const triggerDataChange = useCallback((event: DataChangeEvent, data?: any) => {
    console.log(`📡 全局数据事件: ${event}`, data);
    
    // 更新全局状态
    setState(prev => ({
      ...prev,
      lastUpdated: Date.now(),
      version: prev.version + 1
    }));

    // 通知所有监听器
    globalListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('数据变更监听器执行失败:', error);
      }
    });
  }, []);

  // 手动刷新数据
  const refreshData = useCallback(() => {
    triggerDataChange('SAMPLES_CLEARED'); // 使用一个通用事件来触发刷新
  }, [triggerDataChange]);

  // 添加监听器
  const addListener = useCallback((listener: DataChangeListener) => {
    globalListeners.add(listener);
    
    // 返回移除监听器的函数
    return () => {
      globalListeners.delete(listener);
    };
  }, []);

  const contextValue: DataContextType = {
    sampleCount: state.sampleCount,
    lastUpdated: state.lastUpdated,
    version: state.version,
    updateSampleCount,
    triggerDataChange,
    refreshData,
    addListener
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

// Hook for using the context
export const useDataContext = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};

// 便捷的Hook，用于监听数据变更
export const useDataListener = (listener: DataChangeListener) => {
  const { addListener } = useDataContext();
  
  React.useEffect(() => {
    const removeListener = addListener(listener);
    return removeListener;
  }, [addListener, listener]);
};