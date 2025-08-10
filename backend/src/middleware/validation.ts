import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { textLimits } from '../config/security';

// HTML 标签清理
const stripHtmlTags = (str: string): string => {
  return str.replace(/<[^>]*>/g, '');
};

// XSS 防护 - 基础清理
const sanitizeInput = (input: string): string => {
  return stripHtmlTags(input)
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
};

// 验证文本样本输入
export const validateTextSample = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { content, label } = req.body;

    // 验证必填字段
    if (!content || typeof content !== 'string') {
      throw new AppError('文本内容不能为空且必须是字符串', 400);
    }

    if (!label || !['normal', 'clickbait'].includes(label)) {
      throw new AppError('标签必须是 "normal" 或 "clickbait"', 400);
    }

    // 清理和验证内容
    const sanitizedContent = sanitizeInput(content);
    
    if (sanitizedContent.length < textLimits.minLength) {
      throw new AppError(`文本内容不能少于 ${textLimits.minLength} 个字符`, 400);
    }

    if (sanitizedContent.length > textLimits.maxLength) {
      throw new AppError(`文本内容不能超过 ${textLimits.maxLength} 个字符`, 400);
    }

    // 更新请求体为清理后的内容
    req.body.content = sanitizedContent;
    req.body.label = label;

    next();
  } catch (error) {
    next(error);
  }
};

// 验证批量上传
export const validateBatchUpload = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { texts, label } = req.body;

    // 验证标签
    if (!label || !['normal', 'clickbait'].includes(label)) {
      throw new AppError('标签必须是 "normal" 或 "clickbait"', 400);
    }

    // 验证文本数组
    if (!Array.isArray(texts)) {
      throw new AppError('texts 必须是字符串数组', 400);
    }

    if (texts.length === 0) {
      throw new AppError('文本数组不能为空', 400);
    }

    if (texts.length > textLimits.batchSize) {
      throw new AppError(`批量上传数量不能超过 ${textLimits.batchSize} 条`, 400);
    }

    // 清理和验证每个文本
    const sanitizedTexts: string[] = [];
    
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      
      if (typeof text !== 'string') {
        throw new AppError(`第 ${i + 1} 条文本必须是字符串`, 400);
      }

      const sanitizedText = sanitizeInput(text);
      
      if (sanitizedText.length < textLimits.minLength) {
        throw new AppError(`第 ${i + 1} 条文本长度不能少于 ${textLimits.minLength} 个字符`, 400);
      }

      if (sanitizedText.length > textLimits.maxLength) {
        throw new AppError(`第 ${i + 1} 条文本长度不能超过 ${textLimits.maxLength} 个字符`, 400);
      }

      sanitizedTexts.push(sanitizedText);
    }

    // 更新请求体
    req.body.texts = sanitizedTexts;
    req.body.label = label;

    next();
  } catch (error) {
    next(error);
  }
};

// 验证预测请求
export const validatePrediction = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      throw new AppError('预测文本不能为空且必须是字符串', 400);
    }

    const sanitizedText = sanitizeInput(text);
    
    if (sanitizedText.length < 10) {
      throw new AppError('预测文本长度不能少于 10 个字符', 400);
    }

    if (sanitizedText.length > 500) {
      throw new AppError('预测文本长度不能超过 500 个字符', 400);
    }

    // 更新请求体
    req.body.text = sanitizedText;

    next();
  } catch (error) {
    next(error);
  }
};

// 验证批量预测
export const validateBatchPrediction = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { texts } = req.body;

    if (!Array.isArray(texts)) {
      throw new AppError('texts 必须是字符串数组', 400);
    }

    if (texts.length === 0) {
      throw new AppError('文本数组不能为空', 400);
    }

    if (texts.length > 50) { // 批量预测限制更严格
      throw new AppError('批量预测数量不能超过 50 条', 400);
    }

    const sanitizedTexts: string[] = [];

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      
      if (typeof text !== 'string') {
        throw new AppError(`第 ${i + 1} 条文本必须是字符串`, 400);
      }

      const sanitizedText = sanitizeInput(text);
      
      if (sanitizedText.length < 10) {
        throw new AppError(`第 ${i + 1} 条文本长度不能少于 10 个字符`, 400);
      }

      if (sanitizedText.length > 500) {
        throw new AppError(`第 ${i + 1} 条文本长度不能超过 500 个字符`, 400);
      }

      sanitizedTexts.push(sanitizedText);
    }

    req.body.texts = sanitizedTexts;

    next();
  } catch (error) {
    next(error);
  }
};