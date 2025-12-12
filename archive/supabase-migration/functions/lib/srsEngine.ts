export interface SRSData {
  cardId: string;
  userId: string;
  ease: number;
  interval: number;
  repetitions: number;
  lastReview: Date;
  nextReview: Date;
  quality: number;
}

export interface ReviewResult {
  cardId: string;
  quality: number;
  timeSpent: number;
  correct: boolean;
}

class SRSEngine {
  private readonly MIN_EASE = 1.3;
  private readonly MAX_EASE = 5.0;

  processReview(srsData: SRSData, result: ReviewResult) {
    const quality = this.mapResultToQuality(result);
    const updated = this.calculateNextReview(srsData, quality);
    console.debug('SRS slot updated', updated);
    return updated;
  }

  calculateNextReview(srsData: SRSData, quality: number): SRSData {
    const { ease, interval, repetitions } = srsData;
    let newEase = ease;
    let newInterval = interval;
    let newRepetitions = repetitions;

    if (quality >= 3) {
      newEase = Math.max(this.MIN_EASE, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
      if (repetitions === 0) {
        newInterval = 1;
      } else if (repetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(interval * newEase);
      }
      newRepetitions = repetitions + 1;
    } else {
      newEase = Math.max(this.MIN_EASE, ease - 0.2);
      newInterval = 1;
      newRepetitions = 0;
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);

    return {
      ...srsData,
      ease: newEase,
      interval: newInterval,
      repetitions: newRepetitions,
      lastReview: new Date(),
      nextReview,
      quality
    };
  }

  calculateMastery(srsData: SRSData): number {
    const { ease, repetitions, interval } = srsData;
    let mastery = 0;

    if (repetitions >= 5 && ease >= 2.5) {
      mastery = 90 + (ease - 2.5) * 4;
    } else if (repetitions >= 3) {
      mastery = 60 + (ease - 1.3) * 20;
    } else if (repetitions >= 1) {
      mastery = 30 + repetitions * 15;
    }

    if (interval > 7) {
      mastery = Math.min(100, mastery + 10);
    }

    return Math.max(0, Math.min(100, Math.round(mastery)));
  }

  private mapResultToQuality(result: ReviewResult): number {
    const { correct, timeSpent } = result;
    if (!correct) return 0;
    const timeScore = Math.max(0, 5 - timeSpent / 10000);
    return Math.round(Math.max(1, Math.min(5, timeScore)));
  }
}

export const srsEngine = new SRSEngine();
export function buildDefaultSrs(userId: string, cardId: string): SRSData {
  const now = new Date();
  return {
    cardId,
    userId,
    ease: 2.5,
    interval: 1,
    repetitions: 0,
    lastReview: now,
    nextReview: now,
    quality: 0
  };
}
