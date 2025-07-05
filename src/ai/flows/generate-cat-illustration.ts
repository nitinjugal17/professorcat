
'use server';
/**
 * @fileOverview Generates a cat illustration for a given sentence from a story about many tiny cats.
 *
 * - generateCatIllustration - A function to generate the illustration.
 * - GenerateCatIllustrationInput - Input type for the illustration generation.
 * - GenerateCatIllustrationOutput - Output type for the illustration generation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCatIllustrationInputSchema = z.object({
  sentence: z.string().describe('A sentence from a story to illustrate, featuring tiny cats.'),
});
export type GenerateCatIllustrationInput = z.infer<typeof GenerateCatIllustrationInputSchema>;

const GenerateCatIllustrationOutputSchema = z.object({
  imageDataUri: z.string().describe('The generated image as a data URI. Expected format: "data:image/png;base64,<encoded_data>".'),
});
export type GenerateCatIllustrationOutput = z.infer<typeof GenerateCatIllustrationOutputSchema>;

export async function generateCatIllustration(
  input: GenerateCatIllustrationInput
): Promise<GenerateCatIllustrationOutput> {
  return generateCatIllustrationFlow(input);
}

const generateCatIllustrationFlow = ai.defineFlow(
  {
    name: 'generateCatIllustrationFlow',
    inputSchema: GenerateCatIllustrationInputSchema,
    outputSchema: GenerateCatIllustrationOutputSchema,
  },
  async (input) => {
    const { media, text } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate a cute and minimal black and white line drawing to illustrate the following sentence about tiny cats: "${input.sentence}"

**Important Image Requirements:**
- **Content:** The illustration should visually represent the scene described in the sentence, focusing on tiny cats. Cats should be visibly tiny. If the sentence allows, show them in groups or interacting.
- **Style:** Simple, clean, black ink line drawing. Whimsical and reminiscent of classic children's storybook illustrations.
- **Background:** Plain white background.
- **Color:** Strictly black and white. No other colors.
- **No Text in Image:** The image must be purely visual. Absolutely NO text, words, captions, or labels within the illustration itself. If the model needs to explain something or cannot fulfill the request perfectly, it should use the separate text field of the API response, not embed text in the image.
- **Detail:** Avoid complex backgrounds or excessive detail. Focus on clarity to illustrate the sentence.`,
      config: {
        responseModalities: ['IMAGE', 'TEXT'], // MUST provide both TEXT and IMAGE
      },
    });

    if (!media || !media.url) {
      const detail = text ? `API response text: "${text}"` : 'No additional text provided by API.';
      const errorMessage = `Image generation failed or returned no media URL. ${detail}`;
      // Log the detailed message for server-side debugging
      console.error(`generateCatIllustrationFlow Error: ${errorMessage} for sentence: "${input.sentence}"`);
      throw new Error(errorMessage);
    }
    
    // media.url from gemini-2.0-flash-exp for images should be a data URI
    return { imageDataUri: media.url };
  }
);

