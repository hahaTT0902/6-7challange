'use strict';

const { z } = require('zod');

// Allowed: latin letters, digits, CJK unified ideographs, space, underscore, hyphen
const NICKNAME_REGEX = /^[A-Za-z0-9 _\-\u4e00-\u9fff]+$/;
const MAX_ALLOWED_SCORE = Number.parseInt(process.env.MAX_ALLOWED_SCORE || '2000', 10);

const submitScoreSchema = z.object({
  nickname: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length >= 2 && s.length <= 20, {
      message: 'Nickname must be 2-20 characters',
    })
    .refine((s) => NICKNAME_REGEX.test(s), {
      message: 'Nickname contains invalid characters',
    }),
  score: z
    .number()
    .int('Score must be an integer')
    .min(0, 'Score must be >= 0')
    .max(MAX_ALLOWED_SCORE, `Score must be <= ${MAX_ALLOWED_SCORE}`),
});

module.exports = {
  submitScoreSchema,
  NICKNAME_REGEX,
  MAX_ALLOWED_SCORE,
};
