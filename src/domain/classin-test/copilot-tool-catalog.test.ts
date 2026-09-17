import { describe, expect, it } from 'vitest';
import { CLASSIN_COPILOT_QUESTION_IDS, CLASSIN_COPILOT_TOOL_IDS } from '@contracts/classin-test';
import { CLASSIN_COPILOT_TOOL_CATALOG, readClassInCopilotTool, validateClassInCopilotToolCatalog } from './copilot-tool-catalog';

describe('ClassIn Copilot tool catalog', () => {
  it('registers every tool once and covers all 21 approved questions', () => {
    expect(validateClassInCopilotToolCatalog()).toBe(true);
    expect(CLASSIN_COPILOT_TOOL_CATALOG.map(({ id }) => id)).toHaveLength(CLASSIN_COPILOT_TOOL_IDS.length);
    const covered = new Set(CLASSIN_COPILOT_TOOL_CATALOG.flatMap(({ questionIds }) => questionIds));
    expect([...covered].sort()).toEqual([...CLASSIN_COPILOT_QUESTION_IDS].sort());
  });

  it('keeps AI analysis explicitly below business fact evidence', () => {
    expect(readClassInCopilotTool('read_ai_analysis').evidenceLevel).toBe('AI_DERIVED');
    expect(readClassInCopilotTool('read_class_transcript').evidenceLevel).toBe('BUSINESS_FACT');
  });
});
