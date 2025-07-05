
"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { generateCatStory, type GenerateCatStoryInput } from "@/ai/flows/generate-cat-story";
import { generateCatIllustration } from "@/ai/flows/generate-cat-illustration";
import { generateSpeechAudio } from "@/ai/flows/generate-speech-audio";
import { StoryGeneratorForm } from "@/components/StoryGeneratorForm";
import { StoryDisplay } from "@/components/StoryDisplay";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { splitStoryIntoSentences } from "@/lib/utils";
import { FileDown, FileImage, Loader2, AlertTriangle, Video as VideoIcon, History, Send as SendIcon, MessageSquare, ThumbsUp, ShieldCheck, XOctagon, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";


// Dynamically import client-side libraries to avoid SSR issues
let jsPDF: typeof import('jspdf').jsPDF | null = null;
let html2canvas: typeof import('html2canvas').default | null = null;
let GIF: typeof import('gif.js') | null = null;

export type StorySentence = {
  id: string;
  text: string;
  lang: 'english' | 'hindi';
  imageUrl: string;
  isImageLoading?: boolean;
  imageError?: string | null;
  'data-ai-hint'?: string;
};

export type CommentRecord = {
  id: string;
  storyId: string;
  author: string;
  text: string;
  timestamp: number;
};

export type StoryRecord = {
  id: string;
  prompt: string;
  language: 'english' | 'hindi';
  story: string;
  sentences: StorySentence[];
  timestamp: number;
  comments?: CommentRecord[];
  likes?: number;
};

// This type is also used by the admin page
export type UserRecord = {
  id: string;
  name: string;
  email: string;
  status: 'approved' | 'pending';
  signupDate: number; // timestamp
  // Per-user feature access controls (default to true/enabled if not present)
  canGenerateStory?: boolean;
  canGenerateIllustration?: boolean;
  canExportPdf?: boolean;
  canExportGif?: boolean;
  canExportVideo?: boolean;
  // Numeric limits (null means no specific numeric limit / uses global boolean or app default)
  storyGenerationLimit?: number | null;
  illustrationGenerationLimit?: number | null;
};


const VIDEO_WIDTH = 600;
const VIDEO_HEIGHT = 400;
const VIDEO_FPS = 10;
const VIDEO_TIMESLICE_MS = 100; 

// Helper to map simple language codes to BCP 47 tags
function getBcp47Lang(lang: 'english' | 'hindi'): string {
  if (lang === 'hindi') return 'hi-IN';
  return 'en-US';
}

const mockBlogPosts: StoryRecord[] = [
  {
    id: 'mock-blog-1',
    prompt: 'The Adventure of the Lost Sparkle Ball', // Title
    language: 'english',
    story: 'Once upon a time, in a cozy little house, lived a tiny calico cat named Pip. Pip\'s most prized possession was a sparkle ball. One day, it rolled under the giant human sofa! Pip, with a brave meow, ventured into the dusty darkness. After a perilous journey past forgotten socks and giant dust bunnies, Pip triumphantly returned with the sparkle ball, a hero in his own tiny eyes.',
    sentences: [
      { id: 'mock-s1-1', text: 'Once upon a time, in a cozy little house, lived a tiny calico cat named Pip.', lang: 'english', imageUrl: 'https://placehold.co/600x400.png', 'data-ai-hint': 'calico cat house' },
      { id: 'mock-s1-2', text: 'Pip\'s most prized possession was a sparkle ball.', lang: 'english', imageUrl: 'https://placehold.co/600x400.png', 'data-ai-hint': 'cat sparkle ball' },
      { id: 'mock-s1-3', text: 'One day, it rolled under the giant human sofa!', lang: 'english', imageUrl: 'https://placehold.co/600x400.png', 'data-ai-hint': 'cat sofa adventure' },
    ],
    timestamp: Date.now() - 86400000 * 2, // 2 days ago
    comments: [
      { id: 'mock-c1-1', storyId: 'mock-blog-1', author: 'ReaderCat1', text: 'Great story!', timestamp: Date.now() - 86400000 },
    ],
    likes: 15,
  },
  {
    id: 'mock-blog-2',
    prompt: 'नन्ही बिल्ली और उड़ता पत्ता (The Tiny Cat and the Flying Leaf)', // Title in Hindi
    language: 'hindi',
    story: 'एक छोटी सी भूरी बिल्ली थी, जिसका नाम था मिनी। एक दिन मिनी ने एक उड़ता हुआ पत्ता देखा। वह पत्ता हवा में नाच रहा था। मिनी उसके पीछे भागी, उसे पकड़ने की कोशिश में। पत्ता कभी ऊपर, कभी नीचे, और मिनी उसके साथ-साथ। आखिर में पत्ता एक ऊँचे पेड़ पर अटक गया, और मिनी नीचे से उसे देखती रह गई। (Ek chhoti si bhuri billi thi, jiska naam tha Mini. Ek din Mini ne ek udta hua patta dekha. Vah patta hava mein naach raha tha. Mini uske peeche bhagi, use pakadne ki koshish mein. Patta kabhi upar, kabhi neeche, aur Mini uske saath-saath. Aakhir mein patta ek oonche ped par atak gaya, aur Mini neeche se use dekhti rah gayi.)',
    sentences: [
      { id: 'mock-s2-1', text: 'एक छोटी सी भूरी बिल्ली थी, जिसका नाम था मिनी।', lang: 'hindi', imageUrl: 'https://placehold.co/600x400.png', 'data-ai-hint': 'brown cat park' },
      { id: 'mock-s2-2', text: 'एक दिन मिनी ने एक उड़ता हुआ पत्ता देखा।', lang: 'hindi', imageUrl: 'https://placehold.co/600x400.png', 'data-ai-hint': 'cat flying leaf' },
    ],
    timestamp: Date.now() - 86400000 * 5, // 5 days ago
    comments: [],
    likes: 8,
  },
];


async function createVideoBlobFromSentences(
  sentences: StorySentence[],
  width: number,
  height: number,
  fps: number,
  onProgress?: (progress: number, message: string) => void,
  prepareFrameForCapture?: (frameIndex: number) => Promise<void>
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    onProgress?.(0, "Error: Canvas context failed.");
    throw new Error('Could not get canvas context');
  }

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  const destinationNode = audioContext.createMediaStreamDestination();
  const videoStreamFromCanvas = canvas.captureStream(fps);
  const videoTrack = videoStreamFromCanvas.getVideoTracks()[0];
  console.log("Video track from canvas:", videoTrack);
  if (videoTrack) {
    console.log("Initial Video track readyState:", videoTrack.readyState, "muted:", videoTrack.muted, "enabled:", videoTrack.enabled, "settings:", videoTrack.getSettings());
  }
  
  const combinedStream = new MediaStream();
  if (videoTrack) {
    combinedStream.addTrack(videoTrack);
  } else {
    onProgress?.(0, "Error: Video track missing.");
    audioContext.close();
    throw new Error("Video track is missing for MediaRecorder.");
  }

  console.log("Initial audio tracks from destinationNode.stream (count: " + destinationNode.stream.getAudioTracks().length + "):", destinationNode.stream.getAudioTracks());
  if (destinationNode.stream.getAudioTracks().length > 0) {
      destinationNode.stream.getAudioTracks().forEach((track, index) => {
        console.log("Initial Audio track " + index + " readyState:", track.readyState, "muted:", track.muted, "enabled:", track.enabled, "settings:", track.getSettings());
        combinedStream.addTrack(track);
        console.log("Added audio track to combinedStream:", track.id, track.readyState);
      });
  }


  console.log("Combined stream tracks before MediaRecorder init (count: " + combinedStream.getTracks().length + " ):", combinedStream.getTracks());

  const recorderOptions: MediaRecorderOptions = {};
  const supportedTypes = [
    'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/webm;codecs=h264,opus', 'video/webm',
  ];
  for (const type of supportedTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      recorderOptions.mimeType = type;
      console.log("MediaRecorder: Using supported MIME type:", type);
      break;
    }
  }
  
  const mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
  console.log("MediaRecorder instance created. Chosen mimeType:", mediaRecorder.mimeType, "State:", mediaRecorder.state);
  
  const recordedChunks: BlobPart[] = [];
  let videoBlobResolve: (blob: Blob) => void;
  let videoBlobReject: (reason?: any) => void;

  const videoPromise = new Promise<Blob>((resolve, reject) => {
    videoBlobResolve = resolve;
    videoBlobReject = reject;
  });

  mediaRecorder.onstart = () => {
    onProgress?.(0, `Recording started. MimeType: ${mediaRecorder.mimeType || 'default'}`);
    console.log('MediaRecorder started successfully. MimeType:', mediaRecorder.mimeType, 'State:', mediaRecorder.state);
  };

  mediaRecorder.ondataavailable = (event) => {
     console.log('MediaRecorder data available. Size:', event.data.size, 'Type:', event.data.type, 'Timecode:', event.timecode, 'State at event:', mediaRecorder.state);
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    } else {
       console.warn('Received empty data chunk from MediaRecorder. State was:', mediaRecorder.state, 'Recorded chunks length:', recordedChunks.length);
    }
  };

  mediaRecorder.onstop = () => {
    audioContext.close(); 
    console.log('MediaRecorder stopped. Total chunks:', recordedChunks.length, 'Total recorded size (approx):', recordedChunks.reduce((acc, chunk) => acc + (chunk instanceof Blob ? chunk.size : 0), 0), 'State:', mediaRecorder.state);
    if (recordedChunks.length === 0) {
        console.error('No data chunks recorded. Video will be empty or invalid. MediaRecorder mimeType was:', mediaRecorder.mimeType);
        onProgress?.(1, 'Error: No data recorded. Video might be empty.');
        videoBlobReject(new Error("No data chunks recorded by MediaRecorder."));
        return;
    }
    const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'video/webm' });
    if (blob.size === 0) {
        console.error('Video Blob is 0 bytes. Recording failed to capture data. MediaRecorder mimeType was:', mediaRecorder.mimeType);
        onProgress?.(1, 'Error: Final video file is 0 bytes.');
        videoBlobReject(new Error("Generated video blob is 0 bytes."));
        return;
    }
    videoBlobResolve(blob);
  };

  mediaRecorder.onerror = (event: Event) => {
    audioContext.close();
    const errorEvent = event as any;
    let errorMessage = 'Unknown MediaRecorder error';
    if (errorEvent.error) errorMessage = `MediaRecorder failed: ${errorEvent.error.name || 'N/A'} - ${errorEvent.error.message || 'No message'}`;
    else if (event.type) errorMessage = `MediaRecorder failed with event type: ${event.type}`;
    onProgress?.(1, `Recorder Error: ${errorMessage}`);
    videoBlobReject(new Error(errorMessage));
  };

  (async () => {
    if (!html2canvas) {
      audioContext.close();
      onProgress?.(0, "Error: html2canvas not loaded.");
      videoBlobReject(new Error("html2canvas library not loaded."));
      return;
    }
    
    try {
      mediaRecorder.start(VIDEO_TIMESLICE_MS);
      console.log("MediaRecorder.start() called with timeslice. State:", mediaRecorder.state);
    } catch (startError) {
      const errMsg = startError instanceof Error ? startError.message : String(startError);
      onProgress?.(0, `Error starting recorder: ${errMsg}`);
      audioContext.close();
      videoBlobReject(startError);
      return;
    }
    
    const bodyBgColor = typeof window !== 'undefined' ? getComputedStyle(document.body).backgroundColor : 'rgb(240, 240, 240)';

    for (let i = 0; i < sentences.length; i++) {
      if (mediaRecorder.state !== 'recording') {
        console.warn(`MediaRecorder state changed to ${mediaRecorder.state} during loop. Stopping video generation.`);
        if (mediaRecorder.state !== 'inactive') {
            try { mediaRecorder.stop(); } catch (e) { console.error("Error stopping recorder during loop:", e); }
        }
        return;
      }
      
      const sentence = sentences[i];
      if (prepareFrameForCapture) await prepareFrameForCapture(i);
      const progressPercentage = (i + 1) / sentences.length;
      
      const elementId = `story-item-${sentence.id}`;
      const elementToCapture = typeof document !== 'undefined' ? document.getElementById(elementId) : null;

      ctx.fillStyle = bodyBgColor;
      ctx.fillRect(0, 0, width, height);

      if (elementToCapture) {
        try {
            let elementBgColor = getComputedStyle(elementToCapture).backgroundColor || 'rgb(255, 255, 255)';
             if (!elementBgColor || elementBgColor === 'transparent' || elementBgColor === 'rgba(0, 0, 0, 0)') {
                let parent: HTMLElement | null = elementToCapture.parentElement;
                while (parent) {
                    const parentBg = getComputedStyle(parent).backgroundColor;
                    if (parentBg && parentBg !== 'transparent' && parentBg !== 'rgba(0, 0, 0, 0)') { elementBgColor = parentBg; break; }
                    if (parent === document.body || !parent.parentElement) { elementBgColor = getComputedStyle(document.body).backgroundColor || 'rgb(255, 255, 255)'; break; }
                    parent = parent.parentElement;
                }
            }
            const finalElementBgColor = (!elementBgColor || elementBgColor === 'transparent' || elementBgColor === 'rgba(0, 0, 0, 0)') ? 'rgb(255, 255, 255)' : elementBgColor;


            const capturedCanvas = await html2canvas(elementToCapture, {
                scale: 1, backgroundColor: finalElementBgColor, useCORS: true, logging: false,
                onclone: (docClone) => {
                  const clonedEl = docClone.getElementById(elementId);
                  if (clonedEl) {
                    clonedEl.style.display = 'block'; clonedEl.style.visibility = 'visible'; clonedEl.style.opacity = '1';
                    [clonedEl, ...Array.from(clonedEl.querySelectorAll('*'))].forEach(el => {
                      if (el instanceof HTMLElement) { el.style.transform = "none"; el.style.animation = "none"; el.style.transition = "none"; el.classList.remove('animate-fadeInUp', 'opacity-0'); }
                    });
                  }
                }
            });
            if (capturedCanvas.width > 0 && capturedCanvas.height > 0) {
              const capAspect = capturedCanvas.width / capturedCanvas.height;
              const videoAspect = width / height;
              let drawWidth, drawHeight, dx, dy;
              if (capAspect > videoAspect) { drawWidth = width; drawHeight = width / capAspect; } 
              else { drawHeight = height; drawWidth = height * capAspect; }
              dx = (width - drawWidth) / 2; dy = (height - drawHeight) / 2;
              if (drawWidth > 0 && drawHeight > 0) {
                console.log(`Frame ${i+1}: Drew captured canvas to main canvas.`);
                ctx.drawImage(capturedCanvas, dx, dy, drawWidth, drawHeight);
              } else {
                 console.warn(`Frame ${i+1}: Calculated drawWidth or drawHeight is zero for element ${elementId}. Skipping drawImage.`);
              }
            } else {
                console.warn(`Frame ${i+1}: html2canvas captured a canvas with zero width or height for element ${elementId}.`);
            }
        } catch (e: any) {
          console.error(`Error using html2canvas for video frame for ${elementId}:`, e);
          ctx.fillStyle = '#E0E0E0'; ctx.fillRect(0,0,width,height);
          ctx.fillStyle = '#000000'; ctx.textAlign = 'center'; ctx.font = '16px Arial';
          ctx.fillText(`Error rendering frame ${i+1}`, width/2, height/2);
        }
      } else {
          console.warn(`Frame ${i+1}: Element with ID ${elementId} not found.`);
      }
      
      try {
          onProgress?.(progressPercentage, `Generating speech: "${sentence.text.substring(0,15)}..."`);
          const audioOutput = await generateSpeechAudio({ text: sentence.text, language: getBcp47Lang(sentence.lang) });

          if (audioOutput.audioDataUri) {
              const audioPlaybackPromise = new Promise<void>(async (audioResolve, audioReject) => {
                  try {
                      const audioResponse = await fetch(audioOutput.audioDataUri);
                      const arrayBuffer = await audioResponse.arrayBuffer();
                      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                      
                      const source = audioContext.createBufferSource();
                      source.buffer = audioBuffer;
                      source.connect(destinationNode); 
                      
                      const playbackTimeout = setTimeout(() => { 
                        try { if(source.playbackState !== source.FINISHED_STATE) source.stop(); } catch(stopErr) { console.warn("Error stopping timed-out audio source:", stopErr); }
                        audioResolve(); 
                      }, Math.max(5000, audioBuffer.duration * 1000 + 1500)); // Increased safety margin

                      source.onended = () => { clearTimeout(playbackTimeout); try { source.disconnect(); } catch(e) {} audioResolve(); };
                      source.start();
                  } catch (decodeError) { 
                    console.error("Audio decoding/playback error:", decodeError);
                    audioReject(decodeError); 
                  }
              });
              await audioPlaybackPromise;
          } else {
            console.warn(`No audioDataUri received for sentence: "${sentence.text.substring(0,20)}...". Using 1s pause.`);
            await new Promise(frameResolve => setTimeout(frameResolve, 1000));
          }
      } catch (speechError: any) {
           const errMsg = speechError?.message || "Unknown TTS error";
           console.warn(`Speech generation/playback failed for "${sentence.text.substring(0,20)}...", falling back to 1s pause. Error: ${errMsg}`);
           onProgress?.(progressPercentage, `TTS error for "${sentence.text.substring(0,10)}...". Using 1s pause.`);
           await new Promise(frameResolve => setTimeout(frameResolve, 1000)); 
      }
      
      onProgress?.(progressPercentage, `Frame ${i + 1}/${sentences.length} processed.`);
    }
    
    console.log("End of loop. Waiting 1000ms before final data request and stop. MediaRecorder state:", mediaRecorder.state);
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    
    if (mediaRecorder.state === "recording") {
        console.log("Requesting final data chunk before stopping. Current MediaRecorder state:", mediaRecorder.state);
        mediaRecorder.requestData();
        await new Promise(resolve => setTimeout(resolve, 500)); // More time for data to be processed
    }
    console.log("State after final requestData and pause:", mediaRecorder.state);

    if (mediaRecorder.state !== "inactive") {
        console.log("Attempting to stop MediaRecorder. Current state:", mediaRecorder.state);
        mediaRecorder.stop();
        console.log("MediaRecorder.stop() called. State after stop call (may not be 'inactive' immediately):", mediaRecorder.state);
    }
  })().catch(err => {
      console.error("Error in createVideoBlobFromSentences async block:", err);
      if (mediaRecorder.state !== "inactive") { try { mediaRecorder.stop(); } catch (e) {console.error("Error stopping recorder in catch block:", e);} }
      audioContext.close(); 
      videoBlobReject(err); 
  });

  return videoPromise;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


export default function HomePage() {
  const [storySentences, setStorySentences] = useState<StorySentence[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isLoadingGif, setIsLoadingGif] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allIllustrationsDone, setAllIllustrationsDone] = useState(false);
  const [currentStoryLanguage, setCurrentStoryLanguage] = useState<'english' | 'hindi'>('english');
  const [imageGenerationProgress, setImageGenerationProgress] = useState<number | null>(null);
  const { toast } = useToast();
  
  const [storyHistory, setStoryHistory] = useState<StoryRecord[]>([]);
  const [selectedStoryForBlog, setSelectedStoryForBlog] = useState<StoryRecord | null>(null);
  const [blogTitle, setBlogTitle] = useState("");
  const [isPublishingBlog, setIsPublishingBlog] = useState(false);
  const [publishedBlogs, setPublishedBlogs] = useState<StoryRecord[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("Anonymous User");

  const [isRetryingIllustration, setIsRetryingIllustration] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [currentRetrySentenceId, setCurrentRetrySentenceId] = useState<string | null>(null);
  const stopIllustrationGenerationRef = useRef(false);

  // Feature Limitation States - these are GLOBAL for the main page for now
  const [isStoryGenLimited, setIsStoryGenLimited] = useState(false);
  const [isIllustrationGenLimited, setIsIllustrationGenLimited] = useState(false);
  const [isPdfExportLimited, setIsPdfExportLimited] = useState(false);
  const [isGifExportLimited, setIsGifExportLimited] = useState(false);
  const [isVideoExportLimited, setIsVideoExportLimited] = useState(false);
  const [anyFeatureLimited, setAnyFeatureLimited] = useState(false);


  useEffect(() => {
    import('jspdf').then(module => jsPDF = module.jsPDF);
    import('html2canvas').then(module => html2canvas = module.default);
    import('gif.js').then(module => GIF = module.default);

    try {
      const storedHistory = localStorage.getItem("storyHistory");
      if (storedHistory) {
        const parsedHistory: StoryRecord[] = JSON.parse(storedHistory);
        setStoryHistory(parsedHistory.map(record => ({
          ...record,
          sentences: record.sentences.map(s => ({
            id: s.id, text: s.text, lang: s.lang, imageUrl: "",
            isImageLoading: false, imageError: null, 'data-ai-hint': s['data-ai-hint'],
          }))
        })));
      }
      const storedBlogs = localStorage.getItem("publishedBlogs");
      if (storedBlogs) {
        const parsedBlogs: StoryRecord[] = JSON.parse(storedBlogs);
        setPublishedBlogs(parsedBlogs.map(record => ({
          ...record,
           // Ensure imageURLs for blogs are either valid persistent URLs or placeholders/empty
          sentences: record.sentences.map(s => ({
            id: s.id, text: s.text, lang: s.lang, 
            imageUrl: (s.imageUrl && !s.imageUrl.startsWith("data:image/")) ? s.imageUrl : (s.imageUrl && s.imageUrl.startsWith("https://placehold.co") ? s.imageUrl : ""),
            isImageLoading: false, imageError: null, 'data-ai-hint': s['data-ai-hint'],
          })),
          comments: record.comments || [],
          likes: record.likes || 0,
        })));
      } else {
         // If no blogs in localStorage, initialize with mock data
        setPublishedBlogs(mockBlogPosts);
      }

      // Load GLOBAL feature limitations for the main page
      const storyGenLimited = localStorage.getItem("adminLimit_storyGeneration") === 'true';
      const illustrationGenLimited = localStorage.getItem("adminLimit_illustrationGeneration") === 'true';
      const pdfExportLimited = localStorage.getItem("adminLimit_pdfExport") === 'true';
      const gifExportLimited = localStorage.getItem("adminLimit_gifExport") === 'true';
      const videoExportLimited = localStorage.getItem("adminLimit_videoExport") === 'true';

      setIsStoryGenLimited(storyGenLimited);
      setIsIllustrationGenLimited(illustrationGenLimited);
      setIsPdfExportLimited(pdfExportLimited);
      setIsGifExportLimited(gifExportLimited);
      setIsVideoExportLimited(videoExportLimited);
      setAnyFeatureLimited(storyGenLimited || illustrationGenLimited || pdfExportLimited || gifExportLimited || videoExportLimited);

    } catch (e) {
      console.error("Error loading from localStorage:", e);
      localStorage.removeItem("storyHistory");
      localStorage.removeItem("publishedBlogs");
      setPublishedBlogs(mockBlogPosts); // Fallback to mock data on error
    }
  }, []);

  useEffect(() => {
    try {
      const historyToStore = storyHistory.map(record => ({
        ...record,
        sentences: record.sentences.map(sentence => ({
          id: sentence.id, text: sentence.text, lang: sentence.lang, 
          imageUrl: "", 
          'data-ai-hint': sentence['data-ai-hint'],
        })),
        comments: record.comments || [], likes: record.likes || 0,
      }));
      localStorage.setItem("storyHistory", JSON.stringify(historyToStore.slice(0, 10))); 
    } catch (e: any) {
      console.error("Error saving storyHistory to localStorage:", e);
      if (e.name === 'QuotaExceededError') {
        toast({
          variant: "destructive", title: "Storage Full",
          description: "Could not save full story history. Older items might be lost.",
        });
      }
    }
  }, [storyHistory, toast]);

  useEffect(() => {
    try {
      const blogsToStore = publishedBlogs.map(record => ({
        ...record,
        sentences: record.sentences.map(sentence => ({
          id: sentence.id, text: sentence.text, lang: sentence.lang, 
          imageUrl: (sentence.imageUrl && !sentence.imageUrl.startsWith("data:image/")) ? sentence.imageUrl : (sentence.imageUrl && sentence.imageUrl.startsWith("https://placehold.co") ? sentence.imageUrl : ""),
          'data-ai-hint': sentence['data-ai-hint'],
        })),
        comments: record.comments || [], likes: record.likes || 0,
      }));
      // Only save if it's not just the initial mock data (to avoid overwriting localStorage with mocks if it was cleared)
      // This check is a bit naive; a better check might be if publishedBlogs !== mockBlogPosts by reference,
      // but for this prototype, we'll save unless it's *exactly* the mockBlogPosts array.
      // Or, more simply, only save if the data isn't the initial mock data and local storage isn't empty.
      const storedBlogsRaw = localStorage.getItem("publishedBlogs");
      if (storedBlogsRaw || blogsToStore.some(b => !mockBlogPosts.find(mb => mb.id === b.id))) {
         localStorage.setItem("publishedBlogs", JSON.stringify(blogsToStore.slice(0, 20)));
      }

    } catch (e: any) {
      console.error("Error saving publishedBlogs to localStorage:", e);
      if (e.name === 'QuotaExceededError') {
         toast({
          variant: "destructive", title: "Storage Full",
          description: "Could not save all blog posts. Older posts might be affected.",
        });
      }
    }
  }, [publishedBlogs, toast]);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isRetryingIllustration && retryCountdown !== null && retryCountdown > 0) {
        timer = setInterval(() => {
            setRetryCountdown(prev => (prev ? prev - 1 : 0));
        }, 1000);
    } else if (retryCountdown === 0 && isRetryingIllustration) { 
        setIsRetryingIllustration(false); 
        setRetryCountdown(null);
    }
    return () => clearInterval(timer);
  }, [isRetryingIllustration, retryCountdown]);


  const saveStoryToHistory = (prompt: string, language: 'english' | 'hindi', storyText: string, sentences: StorySentence[]) => {
    const newRecord: StoryRecord = {
      id: `story-${Date.now()}`, prompt, language, story: storyText,
      sentences: sentences.map(s => ({
        id: s.id, text: s.text, lang: s.lang, imageUrl: "", 'data-ai-hint': s['data-ai-hint']
      })),
      timestamp: Date.now(), comments: [], likes: 0,
    };
    setStoryHistory(prev => [newRecord, ...prev.filter(r => r.id !== newRecord.id)].slice(0, 10));
  };


  const handlePublishBlog = () => {
    if (!selectedStoryForBlog || !blogTitle.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please select a story and provide a blog title." });
      return;
    }
    setIsPublishingBlog(true);
    
    const cleanSentencesForBlog = selectedStoryForBlog.sentences.map(s => ({
        id: s.id, text: s.text, lang: s.lang,
        imageUrl: s.imageUrl && !s.isImageLoading && !s.imageError && !s.imageUrl.startsWith("https://placehold.co") ? s.imageUrl : "",
        'data-ai-hint': s['data-ai-hint'],
    }));
    
    const blogPost: StoryRecord = {
      ...selectedStoryForBlog, prompt: blogTitle, 
      id: `blog-${Date.now()}-${Math.random().toString(36).substring(2,7)}`, // Ensure unique ID for blog post
      sentences: cleanSentencesForBlog,
      timestamp: Date.now(), 
      comments: [], 
      likes: 0, 
    };
    
    setPublishedBlogs(prev => [blogPost, ...prev.filter(p => p.id !== blogPost.id)].slice(0,20));
    toast({ title: "Blog Published!", description: `"${blogTitle}" is now live.` });
    setSelectedStoryForBlog(null); setBlogTitle(""); setIsPublishingBlog(false);
  };

  const handleAddComment = (storyId: string) => {
    if (!commentText.trim() || !commentAuthor.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Author and comment text cannot be empty." });
      return;
    }
    const newComment: CommentRecord = {
      id: `comment-${Date.now()}`, storyId, author: commentAuthor, text: commentText, timestamp: Date.now(),
    };
    const updateComments = (items: StoryRecord[]) => items.map(item => 
      item.id === storyId ? { ...item, comments: [...(item.comments || []), newComment] } : item
    );
    setPublishedBlogs(prevBlogs => updateComments(prevBlogs));
    setCommentText("");
    toast({ title: "Comment Added!", description: "Your insightful comment has been posted." });
  };

  const handleLike = (storyId: string) => {
     const updateLikes = (items: StoryRecord[]) => items.map(item =>
      item.id === storyId ? { ...item, likes: (item.likes || 0) + 1 } : item
    );
    setPublishedBlogs(prevBlogs => updateLikes(prevBlogs));
  };

const generateIllustrationsForAll = async (
    sentencesToIllustrate: StorySentence[],
    storyId: string, 
    updateProgress: (progress: number) => void
) => {
    if (isIllustrationGenLimited) { 
      toast({ title: "Feature Limited", description: "Illustration generation is currently limited by the administrator." });
      setAllIllustrationsDone(true);
      updateProgress(100);
       setStorySentences(prev => prev.map(s => ({ ...s, imageUrl: `https://placehold.co/600x400.png`, isImageLoading: false, imageError: "Admin limited", 'data-ai-hint': 'cat placeholder' })));
      return;
    }

    let localUpdatedSentences = [...sentencesToIllustrate]; 
    updateProgress(0);
    stopIllustrationGenerationRef.current = false; 
    setIsRetryingIllustration(false); 
    setRetryCountdown(null);
    setCurrentRetrySentenceId(null);

    for (let i = 0; i < localUpdatedSentences.length; i++) {
        if (stopIllustrationGenerationRef.current) {
            toast({ title: "Illustration Generation Stopped", description: "Process halted by user." });
            localUpdatedSentences = localUpdatedSentences.map((s, idx) => idx >=i ? {...s, isImageLoading: false, imageError: "Stopped by user"} : s);
            break; 
        }

        const sentence = localUpdatedSentences[i];
        let retries = 0;
        const MAX_RETRIES = 3;
        let exponentialBackoffTime = 5; 

        while (retries <= MAX_RETRIES) {
            if (stopIllustrationGenerationRef.current) break;

            setStorySentences(prev => prev.map(s => s.id === sentence.id ? { ...s, isImageLoading: true, imageError: null } : s));
            setCurrentRetrySentenceId(sentence.id);

            try {
                const illustrationResult = await generateCatIllustration({ sentence: sentence.text });
                localUpdatedSentences[i] = {
                    ...sentence, imageUrl: illustrationResult.imageDataUri,
                    isImageLoading: false, imageError: null, 'data-ai-hint': 'tiny cats story' 
                };
                setIsRetryingIllustration(false); setRetryCountdown(null); setCurrentRetrySentenceId(null); 
                break; 
            } catch (imgErr: any) {
                const errMessage = imgErr.message || "Failed to load image";
                
                if (errMessage.includes("429") || errMessage.toLowerCase().includes("too many requests")) {
                    retries++;
                    if (retries > MAX_RETRIES) {
                        toast({
                            variant: "destructive", title: "Rate Limit Persists",
                            description: `Max retries for "${sentence.text.substring(0, 20)}...". Skipping.`, duration: 7000
                        });
                        localUpdatedSentences[i] = { ...sentence, imageUrl: `https://placehold.co/600x400.png`, isImageLoading: false, imageError: "Max retries reached", 'data-ai-hint': 'cat error' };
                        setIsRetryingIllustration(false); setRetryCountdown(null); setCurrentRetrySentenceId(null);
                        break; 
                    }

                    let delaySeconds = exponentialBackoffTime;
                    const retryDelayMatch = errMessage.match(/retryDelay":"(\d+)s"/); 
                    if (retryDelayMatch && retryDelayMatch[1]) {
                        delaySeconds = parseInt(retryDelayMatch[1], 10);
                    } else {
                        exponentialBackoffTime *= 2; 
                        if (exponentialBackoffTime > 60) exponentialBackoffTime = 60; 
                    }
                    delaySeconds = Math.max(delaySeconds, 1); 

                    toast({
                        title: "Rate Limit Hit",
                        description: `Retrying "${sentence.text.substring(0, 15)}..." in ${delaySeconds}s. (Attempt ${retries}/${MAX_RETRIES})`,
                        duration: (delaySeconds + 2) * 1000 
                    });
                    
                    setIsRetryingIllustration(true); 
                    setRetryCountdown(delaySeconds);
                    
                    let waitedTime = 0;
                    while (waitedTime < delaySeconds * 1000) {
                        if (stopIllustrationGenerationRef.current) break;
                        await new Promise(r => setTimeout(r, 100)); 
                        waitedTime += 100;
                    }
                    
                    setIsRetryingIllustration(false); 
                    setRetryCountdown(null);
                    if (stopIllustrationGenerationRef.current) break; 
                } else {
                    toast({
                        variant: "destructive", title: "Illustration Error",
                        description: `Image for "${sentence.text.substring(0, 25)}..." failed. ${errMessage.substring(0,100)}`,
                        duration: 7000,
                    });
                    localUpdatedSentences[i] = { ...sentence, imageUrl: `https://placehold.co/600x400.png`, isImageLoading: false, imageError: errMessage, 'data-ai-hint': 'cat error' };
                    setIsRetryingIllustration(false); setRetryCountdown(null); setCurrentRetrySentenceId(null); 
                    break; 
                }
            }
        }
        setStorySentences(prev => prev.map(s => s.id === localUpdatedSentences[i].id ? localUpdatedSentences[i] : s));
        updateProgress(((i + 1) / localUpdatedSentences.length) * 100);
    }
    
    setIsRetryingIllustration(false);
    setRetryCountdown(null);
    setCurrentRetrySentenceId(null);
    setAllIllustrationsDone(true);

    const updateStoryStateWithIllustrations = (storyList: StoryRecord[]): StoryRecord[] =>
        storyList.map(histStory =>
          histStory.id === storyId
            ? { ...histStory, sentences: localUpdatedSentences.map(s => ({...s})) } 
            : histStory
    );
    setStoryHistory(prevHistory => updateStoryStateWithIllustrations(prevHistory));
    setPublishedBlogs(prevBlogs => updateStoryStateWithIllustrations(prevBlogs));

    if (!stopIllustrationGenerationRef.current) {
        toast({ title: "Illustrations Complete!", description: "All images have been generated for this session." });
    }
};

  const handleSubmitPrompt = async (data: GenerateCatStoryInput) => {
    setIsLoadingStory(true); setError(null); setStorySentences([]);
    setCurrentSentenceIndex(0); setAllIllustrationsDone(false); setImageGenerationProgress(0);
    setCurrentStoryLanguage(data.language);
    stopIllustrationGenerationRef.current = false; 
    setIsRetryingIllustration(false); setRetryCountdown(null); setCurrentRetrySentenceId(null); 
    
    let storyRecord = storyHistory.find(hist => hist.prompt === data.prompt && hist.language === data.language);
    const currentStoryId = storyRecord ? storyRecord.id : `story-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;

    if (storyRecord) {
        const imagesAlreadyLoadedInSession = storySentences.length > 0 &&
                                    storySentences.every(s => s.imageUrl && !s.imageUrl.startsWith("https://placehold.co") && !s.imageError && !s.isImageLoading) &&
                                    storyRecord.id === (storySentences[0]?.id.split('-').slice(0,3).join('-')); // Compare full story ID part
        
        if (imagesAlreadyLoadedInSession) {
            toast({ title: "Story Loaded from Session Cache", description: "This tale and its illustrations are ready!" });
            setAllIllustrationsDone(true); setImageGenerationProgress(100);
            setIsLoadingStory(false);
            return;
        } else {
            const sentencesWithTextOnly = storyRecord.sentences.map(s => ({
                ...s, imageUrl: "", isImageLoading: !isIllustrationGenLimited, imageError: null, 
            }));
            setStorySentences(sentencesWithTextOnly); 
            setCurrentStoryLanguage(storyRecord.language);
            setIsLoadingStory(false); 
            
            if (isIllustrationGenLimited) {
                toast({ title: "Reloading Story from History", description: "Illustrations are admin-limited. Showing placeholders." });
                setAllIllustrationsDone(true); setImageGenerationProgress(100);
                setStorySentences(prev => prev.map(s => ({ ...s, imageUrl: `https://placehold.co/600x400.png`, isImageLoading: false, imageError: "Admin limited", 'data-ai-hint': 'cat placeholder' })));
            } else {
                toast({ title: "Reloading Story from History", description: "Generating fresh illustrations..." });
                if (sentencesWithTextOnly.length > 0) {
                    await generateIllustrationsForAll(sentencesWithTextOnly, currentStoryId, setImageGenerationProgress);
                } else {
                    setAllIllustrationsDone(true); setImageGenerationProgress(null);
                }
            }
            return;
        }
    }

    try {
      setIsLoadingStory(true); // Ensure loading state is true for new story generation
      const result = await generateCatStory(data);
      setIsLoadingStory(false); 
      if (result.story) {
        const sentencesText = splitStoryIntoSentences(result.story);
        const newSentences: StorySentence[] = sentencesText.map((text, index) => ({
          id: `sentence-${currentStoryId}-${index}`, text, lang: data.language, imageUrl: "",
          isImageLoading: !isIllustrationGenLimited, 
          imageError: null, 'data-ai-hint': 'tiny cats query', 
        }));
        setStorySentences(newSentences);
        saveStoryToHistory(data.prompt, data.language, result.story, newSentences); 
        
        toast({ title: "Story Text Generated!", description: isIllustrationGenLimited ? "Illustrations are admin-limited. Showing placeholders." : "Generating illustrations next..." });
        
        if (newSentences.length > 0) {
           if (!isIllustrationGenLimited) { 
             await generateIllustrationsForAll(newSentences, currentStoryId, setImageGenerationProgress);
           } else {
              setStorySentences(prev => prev.map(s => ({ ...s, imageUrl: `https://placehold.co/600x400.png`, isImageLoading: false, imageError: "Admin limited", 'data-ai-hint': 'cat placeholder' })));
              setAllIllustrationsDone(true); setImageGenerationProgress(100);
           }
        } else {
          setAllIllustrationsDone(true); setImageGenerationProgress(null);
        }
      } else { throw new Error("The generated story was empty."); }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to generate story.";
      setError(errorMessage);
      toast({ variant: "destructive", title: "Error Generating Story", description: errorMessage });
      setAllIllustrationsDone(true); setImageGenerationProgress(null);
      setIsLoadingStory(false); 
    }
  };

  const handleGeneratePdf = async () => {
    if (!jsPDF || !html2canvas) { toast({ variant: "destructive", title: "Error", description: "PDF library not loaded." }); return; }
    if (storySentences.length === 0 || storySentences.some(s => s.isImageLoading && !s.imageUrl.startsWith('https://placehold.co'))) { 
        toast({ variant: "destructive", title: "Illustrations Pending", description: "Please wait for all illustrations to load or complete." }); return; 
    }
    setIsLoadingPdf(true); toast({ title: "Generating PDF...", description: "Please wait." });
    const originalIndex = currentSentenceIndex;
    try {
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
      const pageOpt = { width: pdf.internal.pageSize.getWidth(), height: pdf.internal.pageSize.getHeight() };
      const pageMargin = 20;
      for (let i = 0; i < storySentences.length; i++) {
        setCurrentSentenceIndex(i); await new Promise(r => requestAnimationFrame(() => setTimeout(r, 100))); 
        const sentence = storySentences[i]; const elementId = `story-item-${sentence.id}`;
        const element = document.getElementById(elementId);
        if (element) {
          let elementBgColor = getComputedStyle(element).backgroundColor;
            if (!elementBgColor || elementBgColor === 'transparent' || elementBgColor === 'rgba(0, 0, 0, 0)') {
                let parent: HTMLElement | null = element.parentElement;
                while (parent) {
                    const parentBg = getComputedStyle(parent).backgroundColor;
                    if (parentBg && parentBg !== 'transparent' && parentBg !== 'rgba(0, 0, 0, 0)') { elementBgColor = parentBg; break; }
                    if (parent === document.body || !parent.parentElement) { 
                        elementBgColor = getComputedStyle(document.body).backgroundColor || 'rgb(255, 255, 255)'; 
                        break; 
                    }
                    parent = parent.parentElement;
                }
            }
          const finalElementBgColor = (!elementBgColor || elementBgColor === 'transparent' || elementBgColor === 'rgba(0, 0, 0, 0)') ? 'rgb(255, 255, 255)' : elementBgColor;
          
          element.style.opacity = '1'; element.style.display = 'block'; element.style.visibility = 'visible';
          element.classList.remove('animate-fadeInUp', 'opacity-0');

          const canvas = await html2canvas(element, {
            scale: 2, backgroundColor: finalElementBgColor, useCORS: true, logging: false,
            onclone: (docClone) => {
              const clonedEl = docClone.getElementById(elementId);
              if (clonedEl) {
                clonedEl.style.display = 'block'; clonedEl.style.visibility = 'visible'; clonedEl.style.opacity = '1';
                [clonedEl, ...Array.from(clonedEl.querySelectorAll('*'))].forEach(el => {
                  if (el instanceof HTMLElement) { el.style.transform = "none"; el.style.animation = "none"; el.style.transition = "none"; el.classList.remove('animate-fadeInUp', 'opacity-0');}
                });
              }
            }
          });
          const imgData = canvas.toDataURL('image/png');
          if (imgData === 'data:,') { 
            console.warn(`PDF: Content capture failed for sentence ${i + 1}. Skipping page.`);
            if (i > 0) pdf.addPage();
            pdf.setFillColor(200, 200, 200); pdf.rect(pageMargin, pageMargin, pageOpt.width - 2 * pageMargin, pageOpt.height - 2 * pageMargin, 'F');
            pdf.setTextColor(0,0,0); pdf.text("Content capture failed for this page.", pageOpt.width / 2, pageOpt.height / 2, { align: 'center' });
            continue;
          }
          if (i > 0) pdf.addPage();
          const imgProps = pdf.getImageProperties(imgData);
          const availableWidth = pageOpt.width - 2 * pageMargin; const availableHeight = pageOpt.height - 2 * pageMargin;
          let newImgWidth = imgProps.width; let newImgHeight = imgProps.height;
          const imgAspect = newImgWidth / newImgHeight; const pageAspect = availableWidth / availableHeight;
          if (imgAspect > pageAspect) { newImgWidth = availableWidth; newImgHeight = newImgWidth / imgAspect; }
          else { newImgHeight = availableHeight; newImgWidth = newImgHeight * imgAspect; }
          const x = (pageOpt.width - newImgWidth) / 2; const y = (pageOpt.height - newImgHeight) / 2;
          pdf.addImage(imgData, 'PNG', x, y, newImgWidth, newImgHeight);
        } else {
            console.warn(`PDF: Element for sentence ${i + 1} not found. Adding placeholder page.`);
            if (i > 0) pdf.addPage(); pdf.text("Content not found for this page.", pageOpt.width / 2, pageOpt.height / 2, { align: 'center' });
        }
      }
      pdf.save('tiny-cat-tale.pdf');
      toast({ title: "PDF Generated!", description: "Your PDF has been downloaded." });
    } catch (e:any) {
      const errorMessage = e instanceof Error ? e.message : "Failed to generate PDF.";
      toast({ variant: "destructive", title: "PDF Generation Failed", description: errorMessage.substring(0,150) });
      setError(`PDF Error: ${errorMessage}`);
    } finally { setCurrentSentenceIndex(originalIndex); setIsLoadingPdf(false); }
  };

  const handleGenerateGif = async () => {
     if (!GIF || !html2canvas) { toast({ variant: "destructive", title: "Error", description: "GIF library not loaded." }); return; }
     if (storySentences.length === 0 || storySentences.some(s => s.isImageLoading && !s.imageUrl.startsWith('https://placehold.co'))) { 
        toast({ variant: "destructive", title: "Illustrations Pending", description: "Wait for all illustrations." }); return; 
    }
    setIsLoadingGif(true); toast({ title: "Generating GIF...", description: "Please wait!" });
    const originalIndex = currentSentenceIndex;
    try {
      const gifInstance = new GIF({
        workers: 2, quality: 10, workerScript: '/gif.worker.js', 
        width: VIDEO_WIDTH, height: VIDEO_HEIGHT, background: '#FFFFFF', transparent: null, 
      });
      let validFramesAdded = 0;
      for (let i = 0; i < storySentences.length; i++) {
        const sentence = storySentences[i];
        if (sentence.isImageLoading || sentence.imageError || !sentence.imageUrl ) { 
            console.warn(`GIF: Skipping frame for sentence ${i+1} due to loading/error/placeholder.`);
            continue;
        }
        setCurrentSentenceIndex(i); await new Promise(r => requestAnimationFrame(() => setTimeout(r, 100)));
        const elementId = `story-item-${sentence.id}`; const element = document.getElementById(elementId);
        if (element) {
           let elementBgColor = getComputedStyle(element).backgroundColor;
            if (!elementBgColor || elementBgColor === 'transparent' || elementBgColor === 'rgba(0, 0, 0, 0)') {
                let parent: HTMLElement | null = element.parentElement;
                while (parent) {
                    const parentBg = getComputedStyle(parent).backgroundColor;
                    if (parentBg && parentBg !== 'transparent' && parentBg !== 'rgba(0, 0, 0, 0)') { elementBgColor = parentBg; break; }
                    if (parent === document.body || !parent.parentElement) { 
                        elementBgColor = getComputedStyle(document.body).backgroundColor || 'rgb(255, 255, 255)'; break; 
                    }
                    parent = parent.parentElement;
                }
            }
           const finalElementBgColor = (!elementBgColor || elementBgColor === 'transparent' || elementBgColor === 'rgba(0, 0, 0, 0)') ? 'rgb(255, 255, 255)' : elementBgColor;
           element.style.opacity = '1'; element.style.display = 'block'; element.style.visibility = 'visible';
           element.classList.remove('animate-fadeInUp', 'opacity-0');
           
           const tempCanvas = document.createElement('canvas');
           tempCanvas.width = VIDEO_WIDTH;
           tempCanvas.height = VIDEO_HEIGHT;
           const tempCtx = tempCanvas.getContext('2d');
           if (!tempCtx) {
             console.warn(`GIF: Failed to get context for temp canvas for sentence ${i+1}`);
             continue;
           }
            tempCtx.fillStyle = finalElementBgColor; 
            tempCtx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

           const capturedCanvas = await html2canvas(element, {
                scale: Math.min(2, VIDEO_WIDTH / Math.max(1, element.offsetWidth)), 
                useCORS: true, backgroundColor: finalElementBgColor, logging: false,
                onclone: (docClone) => {
                  const clonedEl = docClone.getElementById(elementId);
                  if (clonedEl) {
                    clonedEl.style.display = 'block'; clonedEl.style.visibility = 'visible'; clonedEl.style.opacity = '1';
                    [clonedEl, ...Array.from(clonedEl.querySelectorAll('*'))].forEach(el => {
                      if (el instanceof HTMLElement) { el.style.transform = "none"; el.style.animation = "none"; el.style.transition = "none"; el.classList.remove('animate-fadeInUp', 'opacity-0');}
                    });
                  }
                }
              });
            
            const capAspect = capturedCanvas.width / capturedCanvas.height;
            const videoAspect = VIDEO_WIDTH / VIDEO_HEIGHT;
            let drawWidth, drawHeight, dx, dy;
            if (capAspect > videoAspect) { 
                drawWidth = VIDEO_WIDTH;
                drawHeight = VIDEO_WIDTH / capAspect;
            } else { 
                drawHeight = VIDEO_HEIGHT;
                drawWidth = VIDEO_HEIGHT * capAspect;
            }
            dx = (VIDEO_WIDTH - drawWidth) / 2;
            dy = (VIDEO_HEIGHT - drawHeight) / 2;
            
            if (drawWidth > 0 && drawHeight > 0) {
                 tempCtx.drawImage(capturedCanvas, dx, dy, drawWidth, drawHeight);
                 gifInstance.addFrame(tempCanvas, { delay: 2000, copy: true }); 
                 validFramesAdded++;
            } else {
                console.warn(`GIF: Calculated drawWidth/Height is zero for sentence ${i+1}. Skipping frame.`);
            }
        } else {
            console.warn(`GIF: Element for sentence ${i+1} not found. Skipping frame.`);
        }
      }
      if (validFramesAdded === 0) {
        toast({ variant: "destructive", title: "GIF Failed", description: "No valid images could be processed for the GIF." });
        setIsLoadingGif(false); setCurrentSentenceIndex(originalIndex); return;
      }
      gifInstance.on('finished', (blob: Blob) => {
        downloadBlob(blob, 'tiny-cat-tale.gif');
        toast({ title: "GIF Generated!", description: "Your animated tale is ready!" });
        setIsLoadingGif(false); setCurrentSentenceIndex(originalIndex);
      });
      gifInstance.on('progress', (p: number) => {
         toast({ id: "gif-progress-toast", title: "GIF Progress", description: `Processing... ${(p * 100).toFixed(0)}%`, duration: 2000 });
      });
      gifInstance.render();
    } catch (e:any) {
      const errorMessage = e instanceof Error ? e.message : "Failed to generate GIF.";
      toast({ variant: "destructive", title: "GIF Generation Failed", description: errorMessage.substring(0,150) });
      setError(`GIF Error: ${errorMessage}`); setIsLoadingGif(false); setCurrentSentenceIndex(originalIndex);
    }
  };

  const handleGenerateVideo = async () => {
    if (storySentences.length === 0 || storySentences.some(s => s.isImageLoading && !s.imageUrl.startsWith('https://placehold.co'))) { 
        toast({ variant: "destructive", title: "Illustrations Pending", description: "Wait for illustrations." }); return; 
    }
    if (typeof MediaRecorder === 'undefined' || (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined')) {
        toast({ variant: "destructive", title: "Unsupported Browser", description: "Video/Audio features not supported." }); return;
    }
    setIsLoadingVideo(true); toast({ title: "Preparing Video with Gemini TTS...", description: "This may take time.", duration: 5000 });
    const originalIndex = currentSentenceIndex;
    const validSentencesForVideo = storySentences.filter(s => !s.isImageLoading && s.imageUrl && !s.imageUrl.startsWith("https://placehold.co") && !s.imageError);
    if (validSentencesForVideo.length === 0) {
        toast({ variant: "destructive", title: "No Valid Content", description: "No illustrations found for video generation." }); setIsLoadingVideo(false); return;
    }
    try {
      const videoBlob = await createVideoBlobFromSentences(
        validSentencesForVideo, VIDEO_WIDTH, VIDEO_HEIGHT, VIDEO_FPS,
        (progress, message) => {
            toast({ id: "video-progress-toast", title: `Video Progress: ${(progress * 100).toFixed(0)}%`, description: message, duration: progress < 1 ? 15000 : 5000 });
        },
        async (indexToSet) => { 
          const targetSentenceId = validSentencesForVideo[indexToSet]?.id;
          const originalTargetIndex = storySentences.findIndex(s => s.id === targetSentenceId);
          setCurrentSentenceIndex(originalTargetIndex !== -1 ? originalTargetIndex : 0);
          await new Promise(r => requestAnimationFrame(() => setTimeout(r, 100))); 
        }
      );
      const blobMimeType = videoBlob.type; let extension = 'webm'; 
      if (blobMimeType) { const typePart = blobMimeType.split('/')[1]; if (typePart) extension = typePart.split(';')[0]; }
      downloadBlob(videoBlob, `tiny-cat-tale.${extension}`);
      toast({ title: "Video Generated!", description: `Video "tiny-cat-tale.${extension}" with Gemini TTS downloaded.` });
    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : "Failed to generate video.";
      setError(`Video Error: ${errorMessage}`);
      console.error("Full video generation error:", e); 
      if (errorMessage.includes("No data chunks recorded")) {
           toast({ variant: "destructive", title: "Video Failed", description: "No video data recorded. Check console for TTS or canvas errors.", duration: 10000 });
      } else if (errorMessage.includes("MediaRecorder failed")) {
           toast({ variant: "destructive", title: "Video Recording Error", description: `MediaRecorder failed. ${errorMessage.substring(0,100)}`, duration: 10000 });
      } else {
        toast({ variant: "destructive", title: "Video Generation Failed", description: errorMessage.substring(0,150), duration: 7000 });
      }
    } finally { setCurrentSentenceIndex(originalIndex); setIsLoadingVideo(false); }
  };
  
  const isGeneratingAllIllustrations = !isLoadingStory && storySentences.length > 0 && !allIllustrationsDone && !isIllustrationGenLimited;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 flex-grow flex flex-col w-full">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-primary tracking-tight">
            Tiny Tales Weaver
          </h1>
          <p className="mt-3 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Unleash your imagination and craft delightful, AI-powered stories about a world bustling with tiny cats. Watch as their adventures come to life with unique illustrations!
          </p>
        </header>

        {anyFeatureLimited && ( 
           <Alert variant="default" className="my-4 max-w-2xl mx-auto bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
            <Lock className="h-5 w-5 !text-yellow-600 dark:!text-yellow-400" />
            <AlertTitle className="font-semibold text-yellow-800 dark:text-yellow-200">Feature Limitations Active</AlertTitle>
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
              Some content generation or export features may be limited by the site administrator for general use.
            </AlertDescription>
          </Alert>
        )}

        <section className="w-full max-w-2xl mx-auto mb-6 bg-card p-6 sm:p-8 rounded-xl shadow-xl">
          <StoryGeneratorForm 
            onSubmit={handleSubmitPrompt} 
            isLoading={isLoadingStory}
            isDisabled={isStoryGenLimited} 
          />
        </section>

         <section className="w-full max-w-2xl mx-auto mb-12 flex justify-end gap-2 items-center">
            <Link href="/admin" passHref>
              <Button variant="outline" size="sm"><ShieldCheck className="mr-2 h-4 w-4" /> Admin Dashboard</Button>
            </Link>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><History className="mr-2 h-4 w-4" /> View History</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Story History</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[60vh] mt-4">
                  {storyHistory.length === 0 ? <p>No stories generated yet.</p> :
                    storyHistory.map(story => (
                      <div key={story.id} className="mb-4 p-3 border rounded-md bg-muted/30">
                        <p className="font-semibold text-sm">Prompt: <span className="font-normal">{story.prompt}</span></p>
                        <p className="text-xs text-muted-foreground">Language: {story.language} | {new Date(story.timestamp).toLocaleString()}</p>
                         <div className="mt-2 flex gap-2">
                            <Button size="sm" variant="link" className="p-0 h-auto text-primary text-xs" onClick={() => {
                                handleSubmitPrompt({ prompt: story.prompt, language: story.language });
                                const closeButton = document.querySelector('[data-radix-dialog-content] button[aria-label="Close"]');
                                if (closeButton instanceof HTMLElement) closeButton.click();
                            }}>
                            Reload Story
                            </Button>
                            <Button size="sm" variant="link" className="p-0 h-auto text-primary text-xs" onClick={() => {
                              setSelectedStoryForBlog(story);
                              setBlogTitle(story.prompt); 
                              toast({ title: "Story Selected", description: `"${story.prompt.substring(0,30)}..." ready for blog post creation.`});
                               const closeButton = document.querySelector('[data-radix-dialog-content] button[aria-label="Close"]');
                                if (closeButton instanceof HTMLElement) closeButton.click();
                            }}>
                              Publish as Blog Post
                            </Button>
                        </div>
                      </div>
                    ))
                  }
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </section>

        {selectedStoryForBlog && (
          <section className="w-full max-w-2xl mx-auto mb-12 bg-card p-6 sm:p-8 rounded-xl shadow-xl animate-fadeInUp">
            <h2 className="text-2xl font-semibold mb-4 text-primary">Create Blog Post</h2>
            <Input
              placeholder="Blog Post Title"
              value={blogTitle}
              onChange={(e) => setBlogTitle(e.target.value)}
              className="mb-4"
              disabled={isPublishingBlog}
            />
            <div className="mb-4 p-3 border rounded-md bg-muted/30 max-h-60 overflow-y-auto">
              <h3 className="font-semibold">{selectedStoryForBlog.prompt}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedStoryForBlog.story.substring(0, 300)}{selectedStoryForBlog.story.length > 300 && "..."}</p>
            </div>
            <Button onClick={handlePublishBlog} disabled={isPublishingBlog || !blogTitle.trim()} className="w-full">
              {isPublishingBlog ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendIcon className="mr-2 h-4 w-4" />}
              Publish Blog Post
            </Button>
          </section>
        )}

        {isRetryingIllustration && retryCountdown !== null && currentRetrySentenceId && (
            <Alert variant="default" className="my-4 max-w-2xl mx-auto bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
                <AlertTriangle className="h-5 w-5 !text-yellow-600 dark:!text-yellow-400" />
                <AlertTitle className="font-semibold text-yellow-800 dark:text-yellow-200">API Rate Limit Reached</AlertTitle>
                <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                    The image service is busy. Retrying for "{storySentences.find(s => s.id === currentRetrySentenceId)?.text.substring(0, 30) ?? 'current sentence'}..."
                    in <span className="font-bold">{retryCountdown}</span> seconds.
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            stopIllustrationGenerationRef.current = true;
                            setIsRetryingIllustration(false);
                            setRetryCountdown(null);
                            setCurrentRetrySentenceId(null);
                            setStorySentences(prev => prev.map(s => ({...s, isImageLoading: false, imageError: s.isImageLoading ? "Generation stopped by user" : s.imageError})));
                            toast({ title: "Image Generation Halted", description: "You stopped the illustration process.", variant: "destructive"});
                        }}
                        className="ml-4 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-800 dark:text-yellow-300 dark:hover:bg-yellow-800 dark:hover:text-yellow-200 h-auto py-1 px-2"
                    >
                       <XOctagon className="mr-1.5 h-3.5 w-3.5" /> Stop
                    </Button>
                </AlertDescription>
            </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="my-6 max-w-2xl mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>An Error Occurred</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div id="story-content-area" className="flex-grow">
          {(isLoadingStory && storySentences.length === 0 && !isStoryGenLimited) || storySentences.length > 0 ? (
            <StoryDisplay
              sentences={storySentences}
              isLoadingStory={isLoadingStory && storySentences.length === 0} 
              currentSentenceIndex={currentSentenceIndex}
              setCurrentSentenceIndex={setCurrentSentenceIndex}
              imageGenerationProgress={imageGenerationProgress}
              isGeneratingAllIllustrations={isGeneratingAllIllustrations}
            />
          ) : (
              <div className="text-center py-12 text-muted-foreground">
                {isStoryGenLimited ? ( 
                   <Alert variant="default" className="max-w-md mx-auto bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300">
                    <Lock className="h-5 w-5 !text-amber-600 dark:!text-amber-400" />
                    <AlertTitle className="font-semibold text-amber-800 dark:text-amber-200">Story Generation Limited</AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-300">
                      This feature is currently limited by the site administrator.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <p className="text-lg">The grand chronicle of tiny cat adventures awaits your command!</p>
                    <p className="text-sm">Share an idea above, and let their epic (but tiny) tales unfold.</p>
                  </>
                )}
              </div>
          )}
        </div>

        <section className="mt-16 w-full">
          <h2 className="text-3xl font-bold text-center mb-8 text-primary">Cat Tales Blog</h2>
          {publishedBlogs.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {publishedBlogs.map(blog => (
                <Card key={blog.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl overflow-hidden">
                  <CardHeader className="bg-primary p-4">
                     <CardTitle className="text-primary-foreground text-lg">{blog.prompt}</CardTitle>
                     <CardDescription className="text-primary-foreground/80 text-xs">
                        <Badge variant="secondary" className="mr-2 text-xs">{blog.language}</Badge>
                        Published: {new Date(blog.timestamp).toLocaleDateString()}
                     </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 flex-grow space-y-3">
                    {(blog.sentences[0]?.imageUrl && blog.sentences[0]?.imageUrl !== "" && !blog.sentences[0]?.imageError && !blog.sentences[0]?.imageUrl.startsWith("https://placehold.co")) ? (
                       <div className="aspect-video relative w-full mb-3 rounded-md overflow-hidden bg-muted/50 border border-border/20">
                        <Image
                            src={blog.sentences[0].imageUrl}
                            alt={`Blog illustration for ${blog.prompt.substring(0,30)}`}
                            fill
                            style={{objectFit:"contain"}}
                            className="bg-white"
                            data-ai-hint={blog.sentences[0]['data-ai-hint'] || 'cat story'}
                        />
                       </div>
                    ) : (blog.sentences[0]?.imageError) ? (
                        <div className="aspect-video relative w-full mb-3 rounded-md overflow-hidden bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive text-xs p-2">
                          <AlertTriangle className="h-5 w-5 mr-2" /> Image failed to load
                        </div>
                    ) : (
                        <div className="aspect-video relative w-full mb-3 rounded-md overflow-hidden bg-muted/50 border border-border/20 flex items-center justify-center">
                          <Image src="https://placehold.co/600x400.png" alt="Placeholder image for blog post" layout="fill" objectFit="cover" data-ai-hint="cat placeholder" />
                        </div>
                     )}
                    <ScrollArea className="h-24 mb-2 border p-2 rounded-md bg-muted/20">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{blog.story}</p>
                    </ScrollArea>
                    
                    <div className="flex items-center justify-between">
                       <Button variant="ghost" size="sm" onClick={() => handleLike(blog.id)} className="text-primary hover:text-primary/80 px-2 py-1 h-auto">
                         <ThumbsUp className="mr-1.5 h-4 w-4" /> {blog.likes || 0}
                       </Button>
                       <span className="text-xs text-muted-foreground">
                         {blog.comments?.length || 0} Comments
                       </span>
                    </div>

                    <div className="space-y-1.5 max-h-24 overflow-y-auto pr-2">
                      {blog.comments?.slice(-3).reverse().map(comment => (
                        <div key={comment.id} className="text-xs p-1.5 bg-card rounded border border-border/30">
                          <strong className="text-foreground/90">{comment.author}:</strong> <span className="text-foreground/80">{comment.text}</span>
                          <p className="text-muted-foreground text-[10px] mt-0.5">{new Date(comment.timestamp).toLocaleString()}</p>
                        </div>
                      ))}
                       {(!blog.comments || blog.comments.length === 0) && <p className="text-xs text-muted-foreground text-center py-1">No comments yet.</p>}
                    </div>
                     <Input
                        placeholder="Your name (optional)"
                        value={commentAuthor}
                        onChange={(e) => setCommentAuthor(e.target.value)}
                        className="h-8 text-sm mt-2 bg-card"
                      />
                    <Textarea
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="text-sm min-h-[50px] mt-1 bg-card"
                    />
                    <Button size="sm" onClick={() => handleAddComment(blog.id)} className="w-full mt-2 h-9">
                      <MessageSquare className="mr-2 h-4 w-4" /> Post Comment
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 mb-4 text-primary/50" />
              <p className="text-lg">No cat tales have been published to the blog yet.</p>
              <p className="text-sm">Why not create a story and publish it?</p>
            </div>
          )}
        </section>


        {storySentences.length > 0 && (
          <footer className="mt-12 py-6 border-t border-border/60">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Button
                onClick={handleGeneratePdf}
                disabled={isLoadingPdf || isLoadingGif || isLoadingVideo || isLoadingStory || !allIllustrationsDone || isRetryingIllustration || isPdfExportLimited}
                size="lg"
                className="w-full sm:w-auto"
              >
                {isLoadingPdf ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileDown className="mr-2 h-5 w-5" />}
                Download PDF
              </Button>
              <Button
                onClick={handleGenerateGif}
                disabled={isLoadingPdf || isLoadingGif || isLoadingVideo || isLoadingStory || !allIllustrationsDone || isRetryingIllustration || isGifExportLimited}
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isLoadingGif ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileImage className="mr-2 h-5 w-5" />}
                Create GIF
              </Button>
              <Button
                onClick={handleGenerateVideo}
                disabled={isLoadingPdf || isLoadingGif || isLoadingVideo || isLoadingStory || !allIllustrationsDone || isRetryingIllustration || isVideoExportLimited}
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isLoadingVideo ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <VideoIcon className="mr-2 h-5 w-5" />}
                Download Video (with Gemini TTS)
              </Button>
            </div>
            {isGeneratingAllIllustrations && !isLoadingStory && storySentences.some(s => s.isImageLoading === true || (s.imageUrl === "" && !s.imageError)) && !isRetryingIllustration && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Generating illustrations... Please wait for them to complete before downloading.
                {typeof imageGenerationProgress === 'number' && ` (${imageGenerationProgress.toFixed(0)}% done)`}
              </p>
            )}
            {isIllustrationGenLimited && storySentences.length > 0 && ( 
               <p className="text-center text-sm text-amber-600 mt-4">
                Illustrations are currently limited by the site administrator. Placeholder images are shown.
              </p>
            )}
             {storySentences.length > 0 && allIllustrationsDone && !isRetryingIllustration && !isIllustrationGenLimited && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                All illustrations are ready! You can now download your story. Video narration will use Gemini TTS.
              </p>
            )}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Share your tiny cat's adventure with the world!
            </p>
          </footer>
        )}
      </main>
    </div>
  );
}

