
"use client";

import type * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Send } from "lucide-react";

const formSchema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters long.").max(500, "Prompt must be at most 500 characters long."),
  language: z.enum(['english', 'hindi'], {
    required_error: "Please select a language.",
  }).default('english'),
});

type StoryGeneratorFormProps = {
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  isLoading: boolean;
  isDisabled?: boolean; // New prop
};

export function StoryGeneratorForm({ onSubmit, isLoading, isDisabled = false }: StoryGeneratorFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      language: "english",
    },
  });

  const actualIsDisabled = isLoading || isDisabled;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="prompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Your Story Idea</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., A hundred tiny cats build a castle of cushions... or What happens when a legion of tiny cats discover a human-sized garden?"
                  className="min-h-[100px] resize-none bg-card"
                  {...field}
                  disabled={actualIsDisabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-lg">Story Language</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"
                  disabled={actualIsDisabled}
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="english" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      English
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="hindi" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      हिन्दी (Hindi)
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full sm:w-auto" disabled={actualIsDisabled}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Weaving Tale...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Generate Story
            </>
          )}
        </Button>
         {isDisabled && !isLoading && (
          <p className="text-sm text-destructive text-center">Story generation is currently limited by the administrator.</p>
        )}
      </form>
    </Form>
  );
}

