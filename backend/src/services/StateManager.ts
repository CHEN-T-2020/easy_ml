import { TrainingProgress } from '../types/common';

export class StateManager {
  private static instance: StateManager;
  private trainingInProgress: boolean = false;
  private trainingProgress: TrainingProgress = {
    status: 'idle',
    progress: 0,
    message: '',
    metrics: null
  };

  private constructor() {}

  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  // Training state methods
  public isTrainingInProgress(): boolean {
    return this.trainingInProgress;
  }

  public setTrainingInProgress(inProgress: boolean): void {
    this.trainingInProgress = inProgress;
  }

  public getTrainingProgress(): TrainingProgress {
    return { ...this.trainingProgress };
  }

  public updateTrainingProgress(progress: Partial<TrainingProgress>): void {
    this.trainingProgress = { ...this.trainingProgress, ...progress };
  }

  public resetTraining(): void {
    this.trainingInProgress = false;
    this.trainingProgress = {
      status: 'idle',
      progress: 0,
      message: '',
      metrics: null
    };
  }

  // Validation methods
  public validateTrainingData(normalCount: number, clickbaitCount: number): { isValid: boolean; message?: string } {
    const totalSamples = normalCount + clickbaitCount;
    
    if (totalSamples < 4) {
      return {
        isValid: false,
        message: '训练数据不足，至少需要4个样本（每类至少2个）'
      };
    }

    if (normalCount === 0 || clickbaitCount === 0) {
      return {
        isValid: false,
        message: '需要同时包含正常标题和标题党样本'
      };
    }

    return { isValid: true };
  }
}