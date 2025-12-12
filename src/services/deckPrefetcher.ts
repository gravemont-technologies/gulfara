import type { ProfileRecord } from '@/hooks/useEnsureProfile';

export interface FlashcardAIMetadata {
  recommendedEase: number;
  recommendedIntervalDays: number;
  focus: string;
  tags: string[];
  rationale: string;
  confidence?: number;
  lastRecalibratedAt?: string;
}

export interface PrefetchedDeck {
  cards: Array<{
    id: string;
    front: string;
    back: string;
    hint?: string;
    example?: string;
    category: string;
    difficulty: number;
    audio?: string;
    aiMetadata?: FlashcardAIMetadata;
  }>;
  metadata: {
    categories: string[];
    difficultyLevel: string;
    generatedAt: string;
    source: 'openai';
    strategyNotes?: string;
  };
}

export interface DeckPrefetchRequest {
  profile: ProfileRecord;
  categories: string[];
  difficultyLevel: string;
  learningGoals: string[];
}

export class DeckPrefetcher {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = 'https://api.openai.com/v1/responses'
  ) {}

  hasApiKey(): boolean {
    return Boolean(this.apiKey);
  }

  private buildPrompt(request: DeckPrefetchRequest) {
    const { profile, categories, difficultyLevel, learningGoals } = request;

    const categoryList = categories.length > 0 ? categories.join(', ') : 'general conversation';
    const goals = learningGoals.length > 0 ? learningGoals.join(', ') : 'everyday communication';

    return [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: [
              'You are an expert Gulf Arabic curriculum designer and spaced repetition strategist.',
              'Generate a structured JSON deck with 12 Khaleeji-focused flashcards tailored to the learner profile.',
              'Each flashcard must include AI metadata describing recommended ease, interval, focus, tags, and rationale.',
              'All metadata must be grounded in Gulf Arabic usage and cultural context. Respect the schema exactly and avoid commentary.'
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
              learner: {
                name: profile.name,
                level: difficultyLevel,
                goals,
                categories: categoryList,
              }
            }
          }
        ]
      }
    ];
  }

  private buildPayload(request: DeckPrefetchRequest) {
    return {
      model: 'gpt-5-nano',
      input: this.buildPrompt(request),
      text: {
        format: {
          type: 'json_schema',
          json_schema: {
            name: 'gulfara_prefetched_deck',
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                cards: {
                  type: 'array',
                  minItems: 10,
                  maxItems: 15,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      id: { type: 'string' },
                      front: { type: 'string' },
                      back: { type: 'string' },
                      hint: { type: 'string' },
                      example: { type: 'string' },
                      category: { type: 'string' },
                      difficulty: { type: 'number', minimum: 1, maximum: 5 },
                      aiMetadata: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                          recommendedEase: { type: 'number', minimum: 1.3, maximum: 3.5 },
                          recommendedIntervalDays: { type: 'number', minimum: 1, maximum: 21 },
                          focus: { type: 'string' },
                          tags: {
                            type: 'array',
                            minItems: 1,
                            items: { type: 'string' },
                          },
                          rationale: { type: 'string' },
                          confidence: { type: 'number', minimum: 0, maximum: 1 },
                          lastRecalibratedAt: { type: 'string' },
                        },
                        required: ['recommendedEase', 'recommendedIntervalDays', 'focus', 'tags', 'rationale'],
                      },
                    },
                    required: ['id', 'front', 'back', 'category', 'difficulty'],
                  },
                },
                metadata: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    categories: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    difficultyLevel: { type: 'string' },
                    generatedAt: { type: 'string' },
                    source: { type: 'string' },
                    strategyNotes: { type: 'string' },
                  },
                  required: ['categories', 'difficultyLevel', 'generatedAt', 'source'],
                },
              },
              required: ['cards', 'metadata'],
            },
          },
        },
      },
      max_output_tokens: 600,
      temperature: 0.4,
    };
  }

  async generateDeck(request: DeckPrefetchRequest): Promise<PrefetchedDeck> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key missing; cannot generate deck.');
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(this.buildPayload(request)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deck prefetch failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const outputContent =
      data.output?.[0]?.content ??
      data.choices?.[0]?.message?.content ??
      [];

    const jsonContent =
      outputContent.find((item: any) => item?.type === 'json' || item?.type === 'output_json' || item?.type === 'json_schema')?.json ??
      (() => {
        try {
          const fallbackText = outputContent.find((item: any) => item?.text)?.text;
          return fallbackText ? JSON.parse(fallbackText) : null;
        } catch {
          return null;
        }
      })();

    if (!jsonContent) {
      throw new Error('Invalid deck payload from OpenAI');
    }

    return jsonContent as PrefetchedDeck;
  }
}

export const deckPrefetcher = new DeckPrefetcher(import.meta.env.VITE_OPENAI_API_KEY ?? '');

