const RETIRED = new Set(["citation", "citations", "cite", "cites", "cited", "citing", "uncited", "miscited"]);
const words = (line: string): string[] => line.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])/g) ?? [];
export const retiredWord = (line: string): boolean => words(line).some((w) => RETIRED.has(w.toLowerCase()));
