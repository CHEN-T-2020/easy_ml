export interface TextSample {
  id: number;
  content: string;
  label: 'normal' | 'clickbait';
  wordCount: number;
  qualityScore: number;
  createdAt: string;
}

export interface TrainingProgress {
  status: 'idle' | 'training' | 'completed' | 'error';
  progress: number;
  message: string;
  metrics: TrainingMetrics | null;
}

export interface TrainingMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingSamples: number;
  normalSamples: number;
  clickbaitSamples: number;
}

export interface PredictionResult {
  text: string;
  prediction: 'normal' | 'clickbait';
  confidence: number;
  reasoning: string[];
  features: TextFeatures;
}

export interface TextFeatures {
  length: number;
  wordCount: number;
  exclamationCount: number;
  questionCount: number;
  clickbaitWords: number;
  urgencyWords: number;
  emotionalWords: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface BatchUploadResponse {
  importedCount: number;
  skippedCount: number;
  normalCount: number;
  clickbaitCount: number;
  samples: TextSample[];
}