export const difficultyAdjustmentResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          nextDifficulty: 4,
          confidence: 0.82,
          reasoning: 'Mocked difficulty response',
        }),
      },
    },
  ],
  usage: {
    total_tokens: 88,
  },
};

export const recommendationResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify([
          'Review Gulf Arabic greetings',
          'Listen to native speakers',
          'Practice conversation starters',
        ]),
      },
    },
  ],
  usage: {
    total_tokens: 142,
  },
};


