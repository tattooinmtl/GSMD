export type AiProvider = 'minimax' | 'nvidia';

export const AI_PROVIDERS: {
  id: AiProvider;
  label: string;
  hint: string;
  keyPlaceholder: string;
  docsUrl: string;
  docsLabel: string;
  models: string[];
}[] = [
  {
    id: 'minimax',
    label: 'MiniMax',
    hint: 'MiniMax reasoning and chat models at api.minimax.io.',
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.minimax.io',
    docsLabel: 'platform.minimax.io',
    models: ['MiniMax-M3', 'MiniMax-M2', 'MiniMax-M1', 'MiniMax-Text-01'],
  },
  {
    id: 'nvidia',
    label: 'NVIDIA',
    hint: 'NVIDIA NIM models at integrate.api.nvidia.com.',
    keyPlaceholder: 'nvapi-...',
    docsUrl: 'https://build.nvidia.com',
    docsLabel: 'build.nvidia.com',
    models: [
      'nvidia/llama-3.1-nemotron-70b-instruct',
      'meta/llama-3.3-70b-instruct',
      'meta/llama-3.2-90b-vision-instruct',
      'nvidia/nemotron-4-340b-instruct',
    ],
  },
];

export function providerMeta(id: AiProvider) {
  return AI_PROVIDERS.find((p) => p.id === id) || AI_PROVIDERS[0];
}

export function defaultModelFor(id: AiProvider) {
  return providerMeta(id).models[0];
}

export function isAiProvider(value: string): value is AiProvider {
  return value === 'minimax' || value === 'nvidia';
}
