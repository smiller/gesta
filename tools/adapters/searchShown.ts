export interface SearchShown { open: boolean; answered: string | null; rows: number; empty: string }
export function answers(shown: SearchShown | null, q: string): boolean {
  return shown?.answered === q;
}
