const RETIRED = new Set(["citation", "citations", "cite", "cites", "cited", "citing", "uncited", "miscited"]);
const words = (line: string): string[] => line.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])/g) ?? [];
export const retiredWord = (line: string): boolean => words(line).some((w) => RETIRED.has(w.toLowerCase()));
/* the app named by its age reads differently once there is a newer one; a
   quotation of the words keeps them */
const unquoted = (line: string): string => line.replace(/"[^"]*"|“[^”]*”/g, "");
export const retiredName = (line: string, age: "current" | "old" | "either" = "either"): boolean => {
  const ages = age === "either" ? "current|old" : age;
  return new RegExp("\\b(?:" + ages + ")\\s+app\\b", "i").test(unquoted(line));
};
