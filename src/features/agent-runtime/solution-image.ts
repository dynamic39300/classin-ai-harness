import type { RuntimeArtifact } from '@contracts/workbuddy/agent-runtime';
export function isSolutionImage(artifact: RuntimeArtifact) {
  return artifact.format === 'json' && artifact.fileName.endsWith('.solution.json');
}
