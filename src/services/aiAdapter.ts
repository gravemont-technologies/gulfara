// AI Difficulty Adaptation Service for Gulfara
// Uses OpenAI GPT-5 nano/mini for cost-optimized difficulty adjustment
import { costOptimizer } from './costOptimizer';
import { logger } from '@/lib/logger';

export interface UserPerformance {
  userId: string;
  lastResult: boolean;
  avgScore: number;
  targetDifficulty: number;
  recentAnswers: Array<{
    correct: boolean;
    timeSpent: number;
    difficulty: number;
  }>;
}

export interface FlashcardContext {
  cardId: string;
  front: string;
  back: string;
  hint?: string;
  example?: string;
  category?: string;
  difficulty: number;
}

interface DifficultyAdjustment {
  nextDifficulty: number;
  confidence: number;
  reasoning: string;
}

class AIAdapter {
  private baseUrl: string = import.meta.env.VITE_AI_PROXY_URL || '/api/ai-proxy';

  constructor() {}

  /**
   * Adjust difficulty based on user performance using GPT-5 nano (cost-optimized)
   */
  async adjustDifficulty(performance: UserPerformance, card: FlashcardContext): Promise<DifficultyAdjustment> {
    try {
      // Check cost limits before making request
      const estimatedTokens = 100; // Estimated tokens for difficulty adjustment
      if (!costOptimizer.canMakeRequest(performance.userId, estimatedTokens)) {
        console.log('Cost limit reached, using fallback adjustment');
        return this.fallbackAdjustment(performance);
      }

      const model = costOptimizer.getOptimalModel(performance.userId, 'difficulty');
      logger.info('Difficulty adjustment request', { userId: performance.userId, model });

      const openAiPayload = {
        model,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'text',
                text: [
                  'You are an adaptive Gulf Arabic tutor.',
                  'You receive JSON containing learner performance metrics and the flashcard that was just answered.',
                  'Return a JSON object that matches the `gulfara_difficulty_adjustment` schema exactly.',
                  'Do not include any additional keys or commentary.'
                ].join(' ')
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_json',
                json: {
                  performance: {
                    userId: performance.userId,
                    lastResult: performance.lastResult,
                    avgScore: performance.avgScore,
                    targetDifficulty: performance.targetDifficulty,
                    recentAnswers: performance.recentAnswers
                  },
                  card
                }
              }
            ]
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            json_schema: {
              name: 'gulfara_difficulty_adjustment',
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  nextDifficulty: {
                    type: 'number',
                    minimum: 1,
                    maximum: 5
                  },
                  confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1
                  },
                  reasoning: {
                    type: 'string',
                    minLength: 4
                  }
                },
                required: ['nextDifficulty', 'confidence', 'reasoning']
              }
            }
          }
        },
        max_output_tokens: 180,
        temperature: 0.2
      };

      const proxyPayload = {
        action: 'adjustDifficulty',
        userId: performance.userId,
        openAiPayload,
        requestMeta: {
          model,
          estimatedTokens,
          requestType: 'difficulty'
        }
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gulfara-user-id': performance.userId
        },
        body: JSON.stringify(proxyPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI proxy difficulty error:', response.status, errorText);
        throw new Error(`AI proxy request failed (${response.status})`);
      }

      const data = await response.json();
      const tokensUsed = typeof data.tokensUsed === 'number' ? data.tokensUsed : estimatedTokens;
      const jsonContent = data.result ?? data;

      if (!jsonContent || typeof jsonContent.nextDifficulty !== 'number') {
        console.error('AI proxy difficulty response missing payload:', data);
        throw new Error('Invalid difficulty response from proxy');
      }

      costOptimizer.recordUsage(performance.userId, tokensUsed, 'difficultyAdjustment');
      logger.debug('Difficulty adjustment response', { userId: performance.userId, tokensUsed, nextDifficulty: jsonContent.nextDifficulty });

      return {
        nextDifficulty: Math.max(1, Math.min(5, Number(jsonContent.nextDifficulty))),
        confidence: Math.max(0, Math.min(1, Number(jsonContent.confidence))),
        reasoning: typeof jsonContent.reasoning === 'string' ? jsonContent.reasoning : 'AI analysis completed'
      };
    } catch (error) {
      logger.error('AI adaptation error', { userId: performance.userId, message: (error as Error).message });
      return this.fallbackAdjustment(performance);
    }
  }

  /**
   * Create optimized prompt for difficulty adjustment
   */
  private createDifficultyPrompt(performance: UserPerformance): string {
    const { lastResult, avgScore, targetDifficulty, recentAnswers } = performance;
    const recentCorrect = recentAnswers.filter(a => a.correct).length;
    const recentTotal = recentAnswers.length;
    const recentAccuracy = recentTotal > 0 ? (recentCorrect / recentTotal) : 0.5;
    
    return `User performance: Last correct=${lastResult}, Avg score=${avgScore.toFixed(2)}, Target difficulty=${targetDifficulty}, Recent accuracy=${recentAccuracy.toFixed(2)}. Suggest next difficulty (1-5) with confidence (0-1) and brief reasoning.`;
  }

  /**
   * Fallback rule-based difficulty adjustment
   */
  private fallbackAdjustment(performance: UserPerformance): DifficultyAdjustment {
    const { lastResult, avgScore, targetDifficulty, recentAnswers } = performance;
    
    let adjustment = 0;
    let reasoning = '';

    // Analyze recent performance
    const recentCorrect = recentAnswers.filter(a => a.correct).length;
    const recentTotal = recentAnswers.length;
    const recentAccuracy = recentTotal > 0 ? recentCorrect / recentTotal : 0.5;

    // Difficulty adjustment logic
    if (lastResult && recentAccuracy > 0.8) {
      // User is doing well, increase difficulty
      adjustment = 0.2;
      reasoning = 'Strong performance detected, increasing difficulty';
    } else if (!lastResult && recentAccuracy < 0.4) {
      // User is struggling, decrease difficulty
      adjustment = -0.3;
      reasoning = 'Struggling detected, decreasing difficulty';
    } else if (recentAccuracy >= 0.4 && recentAccuracy <= 0.8) {
      // Good balance, slight adjustment based on trend
      const trend = this.calculateTrend(recentAnswers);
      adjustment = trend * 0.1;
      reasoning = `Balanced performance, ${trend > 0 ? 'slight increase' : 'slight decrease'} based on trend`;
    }

    const nextDifficulty = Math.max(1, Math.min(5, targetDifficulty + adjustment));
    const confidence = this.calculateConfidence(recentAnswers);

    return {
      nextDifficulty,
      confidence,
      reasoning
    };
  }

  /**
   * Calculate performance trend from recent answers
   */
  private calculateTrend(answers: Array<{ correct: boolean; timeSpent: number }>): number {
    if (answers.length < 3) return 0;

    const recent = answers.slice(-3);
    const older = answers.slice(-6, -3);

    if (older.length === 0) return 0;

    const recentAccuracy = recent.filter(a => a.correct).length / recent.length;
    const olderAccuracy = older.filter(a => a.correct).length / older.length;

    return recentAccuracy - olderAccuracy;
  }

  /**
   * Calculate confidence in the adjustment
   */
  private calculateConfidence(answers: Array<{ correct: boolean }>): number {
    if (answers.length < 5) return 0.5;

    const correct = answers.filter(a => a.correct).length;
    const total = answers.length;
    const accuracy = correct / total;

    // Higher confidence with more data and clearer patterns
    const dataConfidence = Math.min(1, answers.length / 10);
    const patternConfidence = Math.abs(accuracy - 0.5) * 2; // Higher confidence when accuracy is clearly above/below 50%

    return (dataConfidence + patternConfidence) / 2;
  }

  /**
   * Generate personalized learning recommendations using GPT-5 mini (higher quality)
   */
  async generateRecommendations(userId: string, performance: UserPerformance, card: FlashcardContext): Promise<string[]> {
    try {
      // Check cost limits before making request
      const estimatedTokens = 150; // Estimated tokens for recommendations
      if (!costOptimizer.canMakeRequest(userId, estimatedTokens)) {
        console.log('Cost limit reached, using default recommendations');
        return this.getDefaultRecommendations(performance);
      }

      const model = costOptimizer.getOptimalModel(userId, 'recommendations');

      const payload = {
        model,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'text',
                text: [
                  'You are a Gulf Arabic learning coach.',
                  'Provide concise, actionable recommendations tailored to the learner.',
                  'Return JSON matching the `gulfara_recommendations` schema only.'
                ].join(' ')
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_json',
                json: {
                  performance: {
                    lastResult: performance.lastResult,
                    avgScore: performance.avgScore,
                    targetDifficulty: performance.targetDifficulty,
                    recentAnswers: performance.recentAnswers
                  },
                  card
                }
              }
            ]
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            json_schema: {
              name: 'gulfara_recommendations',
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  recommendations: {
                    type: 'array',
                    minItems: 3,
                    items: {
                      type: 'string',
                      minLength: 12
                    }
                  },
                  focusArea: {
                    type: 'string',
                    description: 'Single phrase describing the primary theme to work on.'
                  }
                },
                required: ['recommendations']
              }
            }
          }
        },
        max_output_tokens: 220,
        temperature: 0.4
      };

      const openAiPayload = {
        model,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'text',
                text: [
                  'You are a Gulf Arabic learning coach.',
                  'Provide concise, actionable recommendations tailored to the learner.',
                  'Return JSON matching the `gulfara_recommendations` schema only.'
                ].join(' ')
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_json',
                json: {
                  performance: {
                    lastResult: performance.lastResult,
                    avgScore: performance.avgScore,
                    targetDifficulty: performance.targetDifficulty,
                    recentAnswers: performance.recentAnswers
                  },
                  card
                }
              }
            ]
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            json_schema: {
              name: 'gulfara_recommendations',
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  recommendations: {
                    type: 'array',
                    minItems: 3,
                    items: {
                      type: 'string',
                      minLength: 12
                    }
                  },
                  focusArea: {
                    type: 'string',
                    description: 'Single phrase describing the primary theme to work on.'
                  }
                },
                required: ['recommendations']
              }
            }
          }
        },
        max_output_tokens: 220,
        temperature: 0.4
      };

      const proxyPayload = {
        action: 'generateRecommendations',
        userId,
        openAiPayload,
        requestMeta: {
          model,
          estimatedTokens,
          requestType: 'recommendations'
        }
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(proxyPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI proxy recommendations error:', response.status, errorText);
        throw new Error(`AI proxy request failed (${response.status})`);
      }

      const data = await response.json();
      const tokensUsed = typeof data.tokensUsed === 'number' ? data.tokensUsed : estimatedTokens;
      const jsonContent = data.result ?? data;

      if (!jsonContent || !Array.isArray(jsonContent.recommendations)) {
        console.error('AI proxy recommendation response missing payload:', data);
        throw new Error('Invalid recommendation response from proxy');
      }

      costOptimizer.recordUsage(userId, tokensUsed, 'recommendations');

      return jsonContent.recommendations.slice(0, 5).map((tip: unknown) => String(tip));
    } catch (error) {
      console.error('Recommendation generation error:', error);
      return this.getDefaultRecommendations(performance);
    }
  }

  /**
   * Create optimized prompt for recommendations
   */
  private createRecommendationPrompt(performance: UserPerformance): string {
    const { avgScore, recentAnswers } = performance;
    const avgTime = recentAnswers.length > 0 
      ? recentAnswers.reduce((sum, a) => sum + a.timeSpent, 0) / recentAnswers.length / 1000
      : 0;
    
    return `User learning profile: Average score=${avgScore.toFixed(2)}, Average response time=${avgTime.toFixed(1)}s, Recent answers=${recentAnswers.length}. Provide 3-5 specific, actionable recommendations for improving Gulf Arabic learning.`;
  }

  /**
   * Default recommendations based on performance
   */
  private getDefaultRecommendations(performance: UserPerformance): string[] {
    const recommendations: string[] = [];
    const { avgScore, recentAnswers } = performance;

    if (avgScore < 0.6) {
      recommendations.push('Focus on basic vocabulary and common phrases');
      recommendations.push('Practice pronunciation with audio examples');
    }

    if (recentAnswers.length > 0) {
      const avgTime = recentAnswers.reduce((sum, a) => sum + a.timeSpent, 0) / recentAnswers.length;
      if (avgTime > 30000) { // 30 seconds
        recommendations.push('Take your time to think through each answer');
        recommendations.push('Review the material before attempting');
      }
    }

    if (avgScore > 0.8) {
      recommendations.push('Try more challenging scenarios');
      recommendations.push('Focus on conversational fluency');
    }

    return recommendations;
  }
}

export const aiAdapter = new AIAdapter();
