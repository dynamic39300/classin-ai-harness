export type GeneralQuestionId = 'A1' | 'A2' | 'A3' | 'A4' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'C5' | 'D1' | 'D2' | 'D5' | 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'F1' | 'F2' | 'F3';
export type GeneralQuestion = Readonly<{
  id: GeneralQuestionId;
  text: string;
  contextRefs: readonly string[];
}>;
/** Only Adapter-supported questions enter the active help, never the entire content library by default. */
export type GeneralQuestionAvailability = Readonly<{
  questions: readonly GeneralQuestion[];
  initialQuestionIds: readonly GeneralQuestionId[];
}>;
