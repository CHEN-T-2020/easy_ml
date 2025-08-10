import { useState, useEffect } from 'react';

// 统一的状态管理工具类
export interface AppState {
  // 模型对比相关状态
  comparison: {
    models: { [key: string]: any };
    results: any[];
    summary: any;
    testText: string;
    trainingStatus: { [key: string]: boolean };
  };
  // 其他状态可以在这里扩展
}

class StateManager {
  private state: AppState;
  private listeners: Set<() => void> = new Set();
  private readonly storageKey = 'app_state';
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): AppState {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load state from localStorage:', error);
    }

    // 默认状态
    return {
      comparison: {
        models: {},
        results: [],
        summary: null,
        testText: '',
        trainingStatus: {}
      }
    };
  }

  private saveState(): void {
    // 防抖保存，避免频繁写入localStorage
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.state));
      } catch (error) {
        console.warn('Failed to save state to localStorage:', error);
      }
      this.saveTimeout = null;
    }, 300); // 300ms 防抖
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // 订阅状态变化
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // 获取完整状态
  getState(): AppState {
    return { ...this.state };
  }

  // 获取特定部分的状态
  getComparisonState() {
    return { ...this.state.comparison };
  }

  // 更新对比状态
  updateComparisonState(updates: Partial<AppState['comparison']>): void {
    this.state.comparison = { ...this.state.comparison, ...updates };
    this.saveState();
    this.notifyListeners();
  }

  // 批量更新（避免多次通知）
  batchUpdate(updater: (state: AppState) => void): void {
    updater(this.state);
    this.saveState();
    this.notifyListeners();
  }

  // 清除状态
  clearState(): void {
    this.state = {
      comparison: {
        models: {},
        results: [],
        summary: null,
        testText: '',
        trainingStatus: {}
      }
    };
    localStorage.removeItem(this.storageKey);
    this.notifyListeners();
  }

  // 清除特定部分状态
  clearComparisonResults(): void {
    this.state.comparison.results = [];
    this.state.comparison.summary = null;
    this.state.comparison.testText = ''; // 清空测试输入框
    this.saveState();
    this.notifyListeners();
  }
}

// 单例实例
export const stateManager = new StateManager();

export function useAppState() {
  const [state, setState] = useState(stateManager.getState());

  useEffect(() => {
    const unsubscribe = stateManager.subscribe(() => {
      setState(stateManager.getState());
    });

    return unsubscribe;
  }, []);

  return state;
}

export function useComparisonState() {
  const [comparisonState, setComparisonState] = useState(stateManager.getComparisonState());

  useEffect(() => {
    const unsubscribe = stateManager.subscribe(() => {
      setComparisonState(stateManager.getComparisonState());
    });

    return unsubscribe;
  }, []);

  return {
    ...comparisonState,
    updateState: (updates: Partial<AppState['comparison']>) => 
      stateManager.updateComparisonState(updates),
    clearResults: () => stateManager.clearComparisonResults()
  };
}