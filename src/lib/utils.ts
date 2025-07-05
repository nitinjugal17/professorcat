
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type StoryRecord, type UserRecord } from "@/app/page"; 


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function splitStoryIntoSentences(storyText: string): string[] {
  if (!storyText) return [];
  // This regex attempts to split sentences more reliably, handling common abbreviations.
  // It's not perfect but better than a simple split.
  const sentences = storyText.match(/[^.!?]+(?:[.!?](?!(\s+[a-z"“]))|[.!?]$)/g);
  return sentences ? sentences.map(s => s.trim()).filter(s => s.length > 0) : [];
}

// Helper function to escape CSV special characters
const escapeCSVField = (field: string | number | boolean | undefined | null): string => {
  const str = String(field ?? ''); // Handle boolean true/false as strings, and null/undefined as empty strings
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export function convertStoryHistoryToCSV(storyHistory: StoryRecord[]): string {
  if (!storyHistory || storyHistory.length === 0) {
    return "";
  }
  
  const headers = [
    "ID", 
    "Timestamp", 
    "Language", 
    "Prompt/Title", 
    "Full Story Text", 
    "Likes Count", 
    "Comment Count"
  ];

  const rows = storyHistory.map(record => {
    const isoTimestamp = new Date(record.timestamp).toISOString();
    const commentCount = record.comments ? record.comments.length : 0;
    const likesCount = record.likes || 0;

    return [
      escapeCSVField(record.id),
      escapeCSVField(isoTimestamp),
      escapeCSVField(record.language),
      escapeCSVField(record.prompt),
      escapeCSVField(record.story), 
      likesCount,
      commentCount
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function convertUsersToCSV(users: UserRecord[]): string {
  if (!users || users.length === 0) {
    return "";
  }

  const headers = [
    "User ID",
    "Name",
    "Email",
    "Status",
    "Signup Date",
    "CanGenerateStory",
    "StoryGenerationLimit",
    "CanGenerateIllustration",
    "IllustrationGenerationLimit",
    "CanExportPdf",
    "CanExportGif",
    "CanExportVideo"
  ];

  const rows = users.map(user => {
    const isoSignupDate = new Date(user.signupDate).toISOString();
    return [
      escapeCSVField(user.id),
      escapeCSVField(user.name),
      escapeCSVField(user.email),
      escapeCSVField(user.status),
      escapeCSVField(isoSignupDate),
      escapeCSVField(user.canGenerateStory !== undefined ? user.canGenerateStory : true),
      escapeCSVField(user.storyGenerationLimit !== null && user.storyGenerationLimit !== undefined ? user.storyGenerationLimit : ''),
      escapeCSVField(user.canGenerateIllustration !== undefined ? user.canGenerateIllustration : true),
      escapeCSVField(user.illustrationGenerationLimit !== null && user.illustrationGenerationLimit !== undefined ? user.illustrationGenerationLimit : ''),
      escapeCSVField(user.canExportPdf !== undefined ? user.canExportPdf : true),
      escapeCSVField(user.canExportGif !== undefined ? user.canExportGif : true),
      escapeCSVField(user.canExportVideo !== undefined ? user.canExportVideo : true)
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}


export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

