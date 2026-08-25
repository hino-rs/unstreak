import { TextToSpeechClient } from "@google-cloud/text-to-speech";

// MVPは単一アクセント・単一ボイス(docs/リスニング.md §13)。
// 複数アクセントに拡張する際は、listening_scenarios側にボイス名を持たせる設計に切り替える
export const DEFAULT_VOICE_NAME = "en-US-Neural2-D";
export const DEFAULT_LANGUAGE_CODE = "en-US";

let cachedClient: TextToSpeechClient | null = null;

function getClient(): TextToSpeechClient {
  if (cachedClient) return cachedClient;

  const credentialsJson = process.env.GOOGLE_TTS_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error("GOOGLE_TTS_CREDENTIALS_JSON is not set");
  }
  cachedClient = new TextToSpeechClient({
    credentials: JSON.parse(credentialsJson),
  });
  return cachedClient;
}

export type SynthesizeSpeechInput = {
  text: string;
  rate: number;
  languageCode?: string;
  voiceName?: string;
};

export async function synthesizeSpeech(input: SynthesizeSpeechInput): Promise<Buffer> {
  const client = getClient();
  const [response] = await client.synthesizeSpeech({
    input: { text: input.text },
    voice: {
      languageCode: input.languageCode ?? DEFAULT_LANGUAGE_CODE,
      name: input.voiceName ?? DEFAULT_VOICE_NAME,
    },
    audioConfig: { audioEncoding: "MP3", speakingRate: input.rate },
  });
  if (!response.audioContent) {
    throw new Error("Cloud TTS synthesizeSpeech returned no audioContent");
  }
  return Buffer.from(response.audioContent);
}
