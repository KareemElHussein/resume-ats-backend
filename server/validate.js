import { z } from 'zod';

// Validates req.body / req.query and puts the cleaned result in req.valid.body / req.valid.query.
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: 'Some fields are invalid.',
        details: result.error.issues.map((i) => ({
          field: i.path.join('.') || source,
          message: i.message,
        })),
      });
    }
    req.valid = { ...req.valid, [source]: result.data };
    next();
  };
}

// Trimmed text with length limits. Postgres rejects the null character, so block it.
export const safeText = (label, min, max) =>
  z.string()
    .trim()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`)
    .refine((s) => !s.includes('\u0000'), `${label} contains invalid characters.`);

export const idParam = z.object({ id: z.string().uuid('That id is not valid.') });
