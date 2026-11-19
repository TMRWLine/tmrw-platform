export type CoverConcept = 'a' | 'c' | 'ac';

export function readCoverConcept(search: string): CoverConcept | null {
  const value = new URLSearchParams(search).get('concept');
  return value === 'a' || value === 'c' || value === 'ac' ? value : null;
}
