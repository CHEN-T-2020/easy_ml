/**
 * 文本质量评分工具类
 * 统一处理文本质量评分逻辑，避免代码重复
 */
export class QualityScorer {
  /**
   * 计算文本质量评分
   * @param content - 文本内容
   * @param label - 文本标签（normal 或 clickbait）
   * @returns 质量评分（0-1之间）
   */
  static calculateQualityScore(content: string, label: 'normal' | 'clickbait'): number {
    let score = 0.5; // 基础分数

    // 长度评分
    const length = content.length;
    if (length > 10 && length < 200) {
      score += 0.2;
    }

    // 标点符号评分
    const punctuationRatio = (content.match(/[！？。，；：]/g) || []).length / length;
    if (punctuationRatio < 0.1) {
      score += 0.15;
    }

    // 大写字母比例（针对英文）
    const capsRatio = (content.match(/[A-Z]/g) || []).length / length;
    if (capsRatio < 0.1) {
      score += 0.15;
    }

    // 根据标签调整
    if (label === 'normal') {
      // 正常标题通常质量更高
      score += 0.2;
    } else {
      // 标题党通常质量较低
      score -= 0.2;
    }

    // 确保分数在 0-1 范围内
    return Math.max(0, Math.min(1, score));
  }

  /**
   * 传统质量评分算法（兼容性保留）
   * @param content - 文本内容
   * @returns 质量评分（0-1之间）
   */
  static calculateQualityScoreTraditional(content: string): number {
    let score = 0;

    // 基础长度评分
    if (content.length >= 50) score += 0.4;
    else if (content.length >= 20) score += 0.2;

    // 标点符号评分
    const punctuationCount = (content.match(/[。！？；：，]/g) || []).length;
    if (punctuationCount >= 2) score += 0.2;

    // 数字和具体信息评分
    const numberCount = (content.match(/\d+/g) || []).length;
    if (numberCount > 0) score += 0.1;

    // 避免过度夸张词汇（针对标题党）
    const exaggeratedWords = ['震惊', '重大发现', '不敢相信', '马上转发', '不转不是'];
    const hasExaggeration = exaggeratedWords.some(word => content.includes(word));
    if (hasExaggeration) score -= 0.3;

    // 确保评分在0-1之间
    return Math.max(0, Math.min(1, score));
  }

  /**
   * 批量计算文本质量评分
   * @param texts - 文本数组
   * @param label - 统一标签
   * @returns 质量评分数组
   */
  static calculateBatchQualityScores(
    texts: string[], 
    label: 'normal' | 'clickbait'
  ): number[] {
    return texts.map(text => this.calculateQualityScore(text, label));
  }

  /**
   * 获取质量评分的可读性描述
   * @param score - 质量评分
   * @returns 描述文本
   */
  static getQualityDescription(score: number): string {
    if (score >= 0.8) return '高质量';
    if (score >= 0.6) return '中等质量';
    if (score >= 0.4) return '一般质量';
    return '低质量';
  }
}