
'use server';
/**
 * @fileOverview Generates speech audio from text using the Google AI Text-to-Speech capability via Genkit.
 *
 * - generateSpeechAudio - A function to generate the speech audio.
 * - GenerateSpeechInput - Input type for the speech generation.
 * - GenerateSpeechOutput - Output type for the speech generation.
 */

import { ai } from '@/ai/genkit';
// Assuming TextToSpeechRequest type is still correctly exported, as the error was specific to the function.
import { type TextToSpeechRequest } from '@genkit-ai/googleai'; 
import { z } from 'genkit'; 

const GenerateSpeechInputSchema = z.object({
  text: z.string().describe('The text to convert to speech.'),
  language: z.string().describe('The BCP-47 language code for the speech (e.g., "en-US", "hi-IN").'),
});
export type GenerateSpeechInput = z.infer<typeof GenerateSpeechInputSchema>;

const GenerateSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated speech audio as a data URI. Expected format: "data:audio/mpeg;base64,<encoded_data>" or similar.'),
});
export type GenerateSpeechOutput = z.infer<typeof GenerateSpeechOutputSchema>;

// Helper to select a Google Cloud TTS voice name based on BCP-47 language code
function getGoogleVoiceName(bcp47LangCode: string): string {
  const lang = bcp47LangCode.toLowerCase();
  if (lang.startsWith('en')) { // e.g., en-US, en-GB
    return 'en-US-Standard-F'; // Standard female voice for English (US) - from texttospeech.googleapis.com docs
  } else if (lang.startsWith('hi')) { // e.g., hi-IN
    return 'hi-IN-Standard-A'; // Standard male voice for Hindi (India) - from texttospeech.googleapis.com docs
  }
  // Defaulting to a common English voice if no specific match
  console.warn(`No specific Google voice name configured for BCP-47 code: ${bcp47LangCode}, defaulting to en-US-Standard-F.`);
  return 'en-US-Standard-F';
}

export async function generateSpeechAudio(input: GenerateSpeechInput): Promise<GenerateSpeechOutput> {
  return generateSpeechAudioFlow(input);
}

const generateSpeechAudioFlow = ai.defineFlow(
  {
    name: 'generateSpeechAudioFlow',
    inputSchema: GenerateSpeechInputSchema,
    outputSchema: GenerateSpeechOutputSchema,
  },
  async (input: GenerateSpeechInput) => {
    // This structure should align with Google Cloud TTS API request.
    // The TextToSpeechRequest type from @genkit-ai/googleai should ideally match this.
    // If the type defines 'text' at top level, this might need adjustment based on the exact type def.
    const ttsRequestPayload = {
      input: { text: input.text }, // Ensure text is nested under 'input'
      voice: {
        languageCode: input.language, // BCP-47 language code
        name: getGoogleVoiceName(input.language), // Specific voice name
      },
      audioConfig: {
        audioEncoding: 'MP3', // Common encoding
      },
    };

    try {
      // Attempting TTS via ai.generate with a speculative model ID for Google TTS
      // The actual model ID and config structure would need to be confirmed
      // from the @genkit-ai/googleai plugin documentation for version 1.8.0.
      const { audio, text: responseText } = await ai.generate({
        model: 'googleai/text-to-speech', // Speculative model ID for a dedicated TTS service via Google AI plugin
        prompt: '', // Using empty prompt; actual text is in config.custom.input.text
        config: {
          custom: ttsRequestPayload, // Pass the detailed TTS parameters here
        },
      });

      if (!audio || !audio.url) {
        const detail = responseText ? `API response text: "${responseText}"` : 'No additional text provided by API.';
        const errorMessage = `TTS generation via ai.generate (model googleai/text-to-speech) failed or returned no audio URL. ${detail}`;
        console.error(`generateSpeechAudioFlow Error: ${errorMessage} for text: "${input.text.substring(0,50)}..."`);
        throw new Error(errorMessage);
      }
      
      // Expecting audio.url to be a data URI string
      if (typeof audio.url !== 'string' || !audio.url.startsWith('data:audio')) {
        console.error('TTS generation (model googleai/text-to-speech) returned an invalid audio URL format:', audio.url);
        throw new Error('TTS generation returned invalid audio data URL.');
      }
      
      return { audioDataUri: audio.url };

    } catch (error: any) {
      let errorMessage = 'Speech generation failed.';
      if (error.message) {
        errorMessage += ` Detail: ${error.message}`;
      }
      errorMessage += ` Input text: "${input.text.substring(0,50)}...". Language: ${input.language}. Voice: ${getGoogleVoiceName(input.language)}. Attempted Model: 'googleai/text-to-speech'.`;
      console.error(`generateSpeechAudioFlow Error: ${errorMessage}`, error);
      // Re-throw the original error or a new one with more context
      throw new Error(errorMessage); 
    }
  }
);
