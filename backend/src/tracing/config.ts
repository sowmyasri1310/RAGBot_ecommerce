import { logger } from '../utils/logger';

// Helper to strip outer quotes and extra whitespace from environment variables
export const cleanEnvVar = (val: string | undefined): string | undefined => {
  if (!val) return undefined;
  const cleaned = val.replace(/^["']|["']$/g, '').trim();
  return cleaned.length > 0 ? cleaned : undefined;
};

export const LangSmithConfig = {
  get apiKey(): string | undefined {
    return cleanEnvVar(process.env.LANGSMITH_API_KEY);
  },

  get projectName(): string {
    return cleanEnvVar(process.env.LANGSMITH_PROJECT) || 'adaptive-rag-ecommerce';
  },

  get endpoint(): string {
    return cleanEnvVar(process.env.LANGSMITH_ENDPOINT) || 'https://api.smith.langchain.com';
  },

  get isEnabled(): boolean {
    const tracingEnv = cleanEnvVar(process.env.LANGSMITH_TRACING);
    const tracingExplicitlyDisabled = tracingEnv === 'false';
    const hasApiKey = !!this.apiKey;
    const enabled = hasApiKey && !tracingExplicitlyDisabled;

    if (!enabled) {
      if (tracingExplicitlyDisabled) {
        logger.info('🔍 LangSmith tracing has been explicitly DISABLED via LANGSMITH_TRACING environment variable.');
      } else {
        logger.info('🔍 LangSmith tracing is running in OFFLINE mode (no API key provided). Traces will be logged locally to debug console.');
      }
    } else {
      logger.info(`✨ LangSmith tracing is active. Logging to project: ${this.projectName}`);
    }
    return enabled;
  }
};
