export type SolutionImage = { title: string; steps: {title: string; explanation: string; formula?: string}[]; conclusion: string };
export function validateSolutionImage(value: unknown): SolutionImage;
export function solutionImageHtml(value: unknown, mathCSS: string): string;
