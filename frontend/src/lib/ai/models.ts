import "server-only";

import { createOllama } from "ollama-ai-provider-v2";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { createGroq } from "@ai-sdk/groq";
import { LanguageModel } from "ai";
import {
  createOpenAICompatibleModels,
  openaiCompatibleModelsSafeParse,
} from "./create-openai-compatiable";
import { ChatModel } from "app-types/chat";

// Helper function to construct Ollama API URL
function getOllamaApiUrl(endpoint: string = ''): string {
  const baseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434/api";
  // Remove /api from the end if it exists to avoid double /api
  const cleanBaseURL = baseURL.replace(/\/api\/?$/, '');
  return `${cleanBaseURL}/api${endpoint}`;
}

// Dynamic Ollama model detection
async function fetchOllamaModels(): Promise<{ [key: string]: LanguageModel }> {
  try {
    const response = await fetch(getOllamaApiUrl('/tags'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Ollama is not available, using fallback models');
      return {};
    }

    const data = await response.json();
    const ollamaModels: { [key: string]: LanguageModel } = {};
    
    if (data.models && Array.isArray(data.models)) {
      for (const model of data.models) {
        const modelName = model.name;
        ollamaModels[modelName] = ollama(modelName);
      }
    }
    
    return ollamaModels;
  } catch (error) {
    console.warn('Failed to fetch Ollama models:', error);
    return {};
  }
}

// Check if Ollama is available
async function checkOllamaAvailability(): Promise<boolean> {
  try {
    const response = await fetch(getOllamaApiUrl('/tags'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch (error) {
    console.warn('Ollama availability check failed:', error);
    return false;
  }
}

const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/api",
});
const groq = createGroq({
  baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

const staticModels = {
  openai: {
    "gpt-4.1": openai("gpt-4.1"),
    "gpt-4.1-mini": openai("gpt-4.1-mini"),
    "o4-mini": openai("o4-mini"),
    o3: openai("o3"),
    "gpt-5": openai("gpt-5"),
    "gpt-5-mini": openai("gpt-5-mini"),
    "gpt-5-nano": openai("gpt-5-nano"),
  },
  google: {
    "gemini-2.5-flash-lite": google("gemini-2.5-flash-lite"),
    "gemini-2.5-flash": google("gemini-2.5-flash"),
    "gemini-2.5-pro": google("gemini-2.5-pro"),
  },
  anthropic: {
    "claude-4-sonnet": anthropic("claude-4-sonnet-20250514"),
    "claude-4-opus": anthropic("claude-4-opus-20250514"),
    "claude-3-7-sonnet": anthropic("claude-3-7-sonnet-20250219"),
  },
  xai: {
    "grok-4": xai("grok-4"),
    "grok-3": xai("grok-3"),
    "grok-3-mini": xai("grok-3-mini"),
  },
  groq: {
    "kimi-k2-instruct": groq("moonshotai/kimi-k2-instruct"),
    "llama-4-scout-17b": groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    "gpt-oss-20b": groq("openai/gpt-oss-20b"),
    "gpt-oss-120b": groq("openai/gpt-oss-120b"),
    "qwen3-32b": groq("qwen/qwen3-32b"),
  },
  openRouter: {
    "gpt-oss-20b:free": openrouter("openai/gpt-oss-20b:free"),
    "qwen3-8b:free": openrouter("qwen/qwen3-8b:free"),
    "qwen3-14b:free": openrouter("qwen/qwen3-14b:free"),
    "qwen3-coder:free": openrouter("qwen/qwen3-coder:free"),
    "deepseek-r1:free": openrouter("deepseek/deepseek-r1-0528:free"),
    "deepseek-v3:free": openrouter("deepseek/deepseek-chat-v3-0324:free"),
    "gemini-2.0-flash-exp:free": openrouter("google/gemini-2.0-flash-exp:free"),
  },
};

// Create all models including dynamic Ollama models
async function createAllModels() {
  const dynamicOllamaModels = await fetchOllamaModels();
  return {
    ...staticModels,
    ollama: dynamicOllamaModels,
  };
}

const staticUnsupportedModels = new Set([
  staticModels.openai["o4-mini"],
  staticModels.openRouter["gpt-oss-20b:free"],
  staticModels.openRouter["qwen3-8b:free"],
  staticModels.openRouter["qwen3-14b:free"],
  staticModels.openRouter["deepseek-r1:free"],
  staticModels.openRouter["gemini-2.0-flash-exp:free"],
]);

const openaiCompatibleProviders = openaiCompatibleModelsSafeParse(
  process.env.OPENAI_COMPATIBLE_DATA,
);

const {
  providers: openaiCompatibleModels,
  unsupportedModels: openaiCompatibleUnsupportedModels,
} = createOpenAICompatibleModels(openaiCompatibleProviders);

const fallbackModel = staticModels.openai["gpt-4.1"];

// Create models info with async API key checking
async function createModelsInfo() {
  const allModels = await createAllModels();
  const allUnsupportedModels = new Set([
    ...openaiCompatibleUnsupportedModels,
    ...staticUnsupportedModels,
  ]);

  const fullModels = { ...openaiCompatibleModels, ...allModels };

  const providersWithAPIKeys = await Promise.all(
    Object.entries(fullModels).map(async ([provider, models]) => ({
      provider,
      models: Object.entries(models).map(([name, model]) => ({
        name,
        isToolCallUnsupported: allUnsupportedModels.has(model),
      })),
      hasAPIKey: await checkProviderAPIKey(provider as keyof typeof staticModels | 'ollama'),
    }))
  );
  return { providersWithAPIKeys, fullModels };
}

export const isToolCallUnsupportedModel = (model: LanguageModel) => {
  const allUnsupportedModels = new Set([
    ...openaiCompatibleUnsupportedModels,
    ...staticUnsupportedModels,
  ]);
  return allUnsupportedModels.has(model);
};

export const customModelProvider = {
  async getModelsInfo() {
    const { providersWithAPIKeys } = await createModelsInfo();
    return providersWithAPIKeys;
  },
  async getModel(model?: ChatModel): Promise<LanguageModel> {
    if (!model) return fallbackModel;
    const { fullModels } = await createModelsInfo();
    return fullModels[model.provider]?.[model.model] || fallbackModel;
  },
};

async function checkProviderAPIKey(provider: keyof typeof staticModels | 'ollama') {
  let key: string | undefined;
  switch (provider) {
    case "openai":
      key = process.env.OPENAI_API_KEY;
      break;
    case "google":
      key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      break;
    case "anthropic":
      key = process.env.ANTHROPIC_API_KEY;
      break;
    case "xai":
      key = process.env.XAI_API_KEY;
      break;
    case "ollama":
      // For Ollama, check if the service is available instead of API key
      return await checkOllamaAvailability();
    case "groq":
      key = process.env.GROQ_API_KEY;
      break;
    case "openRouter":
      key = process.env.OPENROUTER_API_KEY;
      break;
    default:
      return true; // assume the provider has an API key
  }
  return !!key && key != "****";
}
