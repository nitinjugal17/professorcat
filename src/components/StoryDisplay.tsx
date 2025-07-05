
"use client";

import type React from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { StorySentence } from "@/app/page"; 
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type StoryDisplayProps = {
  sentences: StorySentence[];
  isLoadingStory: boolean; 
  currentSentenceIndex: number;
  setCurrentSentenceIndex: (index: number) => void;
  imageGenerationProgress: number | null;
  isGeneratingAllIllustrations: boolean;
};

export function StoryDisplay({ 
  sentences, 
  isLoadingStory, 
  currentSentenceIndex, 
  setCurrentSentenceIndex,
  imageGenerationProgress,
  isGeneratingAllIllustrations 
}: StoryDisplayProps) {

  if (isLoadingStory) { // This typically shows when story text is being fetched, before sentences array is populated.
    return (
      <div className="space-y-8 mt-8">
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="overflow-hidden shadow-lg">
            <CardContent className="p-6">
              <Skeleton className="h-48 w-full mb-4 rounded-md" />
              <Skeleton className="h-6 w-3/4 mb-2 rounded-md" />
              <Skeleton className="h-6 w-1/2 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const navigationProgressValue = sentences.length > 0 ? ((currentSentenceIndex + 1) / sentences.length) * 100 : 0;

  return (
    <div className="mt-8">
      {isGeneratingAllIllustrations && typeof imageGenerationProgress === 'number' && (
        <div className="mb-4">
          <p className="text-sm text-center text-muted-foreground mb-1 tabular-nums">
            Generating illustrations: {imageGenerationProgress.toFixed(0)}% Complete
          </p>
          <Progress value={imageGenerationProgress} className="w-full h-4" aria-label={`Illustrations generation progress: ${imageGenerationProgress.toFixed(0)}% complete`} />
        </div>
      )}

      {!isGeneratingAllIllustrations && sentences.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-center text-muted-foreground mb-1">
            Page {currentSentenceIndex + 1} of {sentences.length}
          </p>
          <Progress value={navigationProgressValue} className="w-full h-4" aria-label={`Story navigation: page ${currentSentenceIndex + 1} of ${sentences.length}`} />
        </div>
      )}
          
      {sentences.length > 0 && (
        <>
          <div className="relative"> 
            {sentences.map((sentence, index) => (
              <Card 
                key={sentence.id} 
                id={`story-item-${sentence.id}`} 
                className={cn(
                  "overflow-hidden shadow-lg bg-card transition-opacity duration-500 ease-in-out",
                  currentSentenceIndex === index ? "block opacity-100 animate-fadeInUp" : "hidden absolute opacity-0 w-full -z-10" 
                  // Added -z-10 to non-active to ensure they don't overlay anything if absolute positioning has issues
                )}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="aspect-[4/3] illustration-container relative w-full mb-4 rounded-md overflow-hidden bg-muted/50 border border-border/20">
                    {sentence.isImageLoading ? (
                      <Skeleton className="h-full w-full" />
                    ) : sentence.imageError ? (
                      <div className="h-full w-full flex flex-col items-center justify-center bg-destructive/10 text-destructive p-4 text-center">
                        <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 mb-2" />
                        <p className="text-xs sm:text-sm font-semibold">Image Error</p>
                        <p className="text-xs max-w-[90%] overflow-hidden text-ellipsis whitespace-nowrap" title={sentence.imageError}>
                          {sentence.imageError.substring(0,100)}
                          {sentence.imageError.length > 100 && "..."}
                        </p>
                      </div>
                    ) : sentence.imageUrl ? (
                      <Image
                        src={sentence.imageUrl} 
                        alt={`Illustration for: ${sentence.text.substring(0, 50)}...`}
                        fill 
                        objectFit="contain" 
                        className="transition-transform duration-300 hover:scale-105 bg-white" 
                        data-ai-hint={sentence['data-ai-hint'] || "tiny cats"}
                        priority={index === currentSentenceIndex} 
                      />
                    ) : ( // Fallback if not loading, no error, but no URL (should ideally not happen if logic is correct)
                       <div className="h-full w-full flex flex-col items-center justify-center bg-muted/30 text-muted-foreground p-4">
                         <Skeleton className="h-full w-full" />
                         <p className="absolute text-sm">Preparing image...</p>
                      </div>
                    )}
                  </div>
                  <p className="text-foreground text-lg leading-relaxed">{sentence.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {!isGeneratingAllIllustrations && sentences.length > 1 && (
            <div className="flex justify-between mt-6">
              <Button 
                onClick={() => setCurrentSentenceIndex(Math.max(0, currentSentenceIndex - 1))} 
                disabled={currentSentenceIndex === 0}
                variant="outline"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              <Button 
                onClick={() => setCurrentSentenceIndex(Math.min(sentences.length - 1, currentSentenceIndex + 1))} 
                disabled={currentSentenceIndex === sentences.length - 1}
                variant="outline"
              >
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

