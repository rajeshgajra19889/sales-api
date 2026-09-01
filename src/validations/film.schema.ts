import { z } from 'zod';

const SPECIAL_FEATURES = ['Trailers', 'Commentaries', 'Deleted Scenes', 'Behind the Scenes'] as const;
const RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17'] as const;

const nullableNumber = z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().nullable().optional()
);

const requiredId = z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? Number.NaN : Number(v)),
    z.number().int().positive('Language is required')
);

export const createFilmValidation = z.object({
    title: z.string().trim().min(1, 'Title is required').max(255),
    description: z.string().nullable().optional(),
    release_year: nullableNumber,
    language_id: requiredId,
    rental_duration: nullableNumber,
    rental_rate: nullableNumber,
    length: nullableNumber,
    replacement_cost: nullableNumber,
    rating: z.enum(RATINGS).default('G'),
    special_features: z.array(z.enum(SPECIAL_FEATURES)).nullable().optional()
});

export type FilmInput = z.infer<typeof createFilmValidation>;