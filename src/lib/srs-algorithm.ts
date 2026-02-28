export interface SRSCard {
    easeFactor: number;
    interval: number; // in days
    repetition: number; // consecutive correct answers
}

/**
 * Calculates the next review schedule using the SM-2 algorithm.
 * 
 * @param card Current state of the card (ease factor, interval, repetition).
 * @param quality Rating of the answer quality (0-5).
 *                0-2: Incorrect / Forgot
 *                3: Hard
 *                4: Good
 *                5: Easy
 * @returns Updated card state and next review date (timestamp).
 */
export function calculateReview(card: SRSCard, quality: number): { card: SRSCard; nextReviewDate: number } {
    let { easeFactor, interval, repetition } = card;

    if (quality < 3) {
        // Correct response was not recalled
        repetition = 0;
        interval = 1;
    } else {
        // Correct response recalled
        if (repetition === 0) {
            interval = 1;
        } else if (repetition === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetition += 1;
    }

    // Update Ease Factor
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    // Calculate next review date
    // interval is in days, convert to ms
    const nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;

    return {
        card: {
            easeFactor,
            interval,
            repetition,
        },
        nextReviewDate,
    };
}

export const RatingMap = {
    again: 1,
    hard: 3,
    good: 4,
    easy: 5,
};
