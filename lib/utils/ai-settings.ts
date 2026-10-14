export type AiSettingsView = {
  enabled: boolean;
  gemini: string | null;
  groq: string | null;
  fromEnv: { gemini: boolean; groq: boolean };
  days: { day: string; gemini: number; groq: number; regole: number }[];
};
