'use server';

/**
 * @fileOverview Generates a short story about lots of tiny cats based on a user-provided prompt and language.
 *
 * - generateCatStory - A function that generates the cat story.
 * - GenerateCatStoryInput - The input type for the generateCatStory function.
 * - GenerateCatStoryOutput - The return type for the generateCatStory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCatStoryInputSchema = z.object({
  prompt: z.string().describe('A prompt inspiring a fun story about lots of tiny cats.'),
  language: z.enum(['english', 'hindi']).describe('The language for the story.'),
});
export type GenerateCatStoryInput = z.infer<typeof GenerateCatStoryInputSchema>;

const GenerateCatStoryOutputSchema = z.object({
  story: z.string().describe('The generated short story about lots of tiny cats.'),
  progress: z.string().describe('Short one-sentence summary of what was generated.'),
});
export type GenerateCatStoryOutput = z.infer<typeof GenerateCatStoryOutputSchema>;

export async function generateCatStory(input: GenerateCatStoryInput): Promise<GenerateCatStoryOutput> {
  return generateCatStoryFlow(input);
}

const generateCatStoryPrompt = ai.definePrompt({
  name: 'generateCatStoryPrompt',
  input: {schema: GenerateCatStoryInputSchema}, 
  output: {schema: GenerateCatStoryOutputSchema},
  prompt: `You are a masterful storyteller, specializing in weaving fun, engaging, and imaginative tales about a world teeming with **lots of tiny cats**.
Your mission is to craft stories that are packed with all the important details – making them super clear and engaging, suitable even for children.
Imagine you're explaining an exciting adventure to a student right before an exam, using a fun story about tiny cats as a metaphor! So, keep it fun, ensure the information is complete for the narrative, but make it easily digestible.
Each story must be a complete, understandable adventure within its short form, focusing on a group of tiny cats.

**Story Style (for both languages):**
-   Craft sentences that are short, yet conversational, casual, and highly engaging.
-   Maintain an upbeat and whimsical vibe throughout the story.
-   Ensure the narrative is clear and easy for children to understand.

**Important Instructions:**
1.  Generate the story in **{{language}}**.
2.  Begin the story **immediately** without any introductory phrases, preambles, or commentary. The response should be the story itself, flowing continuously as a single narrative until its natural conclusion.

The user will provide a starting idea. Expand on it to create a story about many tiny cats.
\n\nUser's Story Idea (Prompt): {{{prompt}}}`,
});

const generateCatStoryFlow = ai.defineFlow(
  {
    name: 'generateCatStoryFlow',
    inputSchema: GenerateCatStoryInputSchema,
    outputSchema: GenerateCatStoryOutputSchema,
  },
  async input => { 
    const {output} = await generateCatStoryPrompt(input);
    // Progress message is kept in English for simplicity.
    // For a multilingual app, this might need to be dynamic based on input.language.
    return {
      ...output!,
      progress: 'Whipped up a delightful tale starring a multitude of tiny cats!',
    };
  }
);

