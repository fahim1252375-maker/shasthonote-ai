import type { MindMapData } from '../types';

/**
 * Validate a stored or AI-generated mind map. Returns null for anything malformed
 * so a corrupted saved resource can never crash the viewer.
 */
export function parseMindMap(input: unknown): MindMapData | null {
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch {
      return null;
    }
  }
  if (typeof value !== 'object' || value === null) return null;

  const raw = value as { centralTopic?: unknown; branches?: unknown };
  if (typeof raw.centralTopic !== 'string' || !raw.centralTopic.trim() || !Array.isArray(raw.branches)) return null;

  const branches = raw.branches
    .filter(
      (branch): branch is { title: string; subtopics: string[] } =>
        typeof branch === 'object' &&
        branch !== null &&
        typeof (branch as { title?: unknown }).title === 'string' &&
        Array.isArray((branch as { subtopics?: unknown }).subtopics) &&
        (branch as { subtopics: unknown[] }).subtopics.every((item) => typeof item === 'string'),
    )
    .slice(0, 12)
    .map((branch) => ({ title: branch.title.slice(0, 200), subtopics: branch.subtopics.slice(0, 12).map((item) => item.slice(0, 300)) }));

  if (branches.length === 0) return null;
  return { centralTopic: raw.centralTopic.trim().slice(0, 200), branches };
}
