import { z } from 'zod';
import { FIXED_RESULTS } from '../data/fixedResults.js';

// Same limits as the database columns, so a typo in the data file fails at startup, not mid-request.
const resultSchema = z.object({
  name: z.string().trim().min(1).max(200),
  match_score: z.number().min(0).max(100),
  keyword_gaps: z.array(z.object({
    keyword: z.string().min(1).max(100),
    category: z.enum(['skill', 'tool', 'qualification', 'other']),
    importance: z.number().int().min(1).max(5),
  })).max(30),
  rewrite_suggestions: z.array(z.object({
    section: z.enum(['summary', 'experience', 'skills', 'education']),
    original_text: z.string().min(1).max(2000),
    suggested_text: z.string().min(1).max(2000),
  })).max(10),
});

// " Nour_Hassan.PDF" -> "nour hassan"
const key = (name) =>
  name.trim().toLowerCase().replace(/\.(pdf|docx|txt)$/, '').replace(/[\s_-]+/g, ' ').trim();

const byName = new Map();
FIXED_RESULTS.forEach((entry, i) => {
  const parsed = resultSchema.safeParse(entry);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`server/data/fixedResults.js entry ${i + 1}: ${issue.path.join('.')}: ${issue.message}`);
  }
  if (byName.has(key(entry.name))) {
    throw new Error(`server/data/fixedResults.js: "${entry.name}" is listed twice`);
  }
  byName.set(key(entry.name), parsed.data);
});

// The fixed result for a resume name, or null if the name isn't in the list.
export function findFixedResult(resumeName) {
  return byName.get(key(resumeName)) ?? null;
}

export const unsupportedResumeMessage = () =>
  `This demo only has results for these resumes: ${FIXED_RESULTS.map((r) => r.name).join(', ')}.`;
