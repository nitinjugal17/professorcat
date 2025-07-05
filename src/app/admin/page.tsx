
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { type StoryRecord, type UserRecord } from "@/app/page"; 
import { downloadBlob, convertStoryHistoryToCSV, convertUsersToCSV } from "@/lib/utils"; 
import { Download, History, AlertTriangle, Users, Settings, CheckCircle, XCircle, Edit3, Database, Cloud, KeyRound, Brain, Trash2, ExternalLink, Lock, LogOut, ShieldAlert, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription as AlertDescriptionShadCN } from "@/components/ui/alert";

const initialUsersSample: UserRecord[] = [
  { id: 'user-1', name: 'Alice Wonderland', email: 'alice@example.com', status: 'approved', signupDate: Date.now() - 86400000 * 5, canGenerateStory: true, canGenerateIllustration: true, canExportPdf: true, canExportGif: true, canExportVideo: true, storyGenerationLimit: null, illustrationGenerationLimit: 50 },
  { id: 'user-2', name: 'Bob The Builder', email: 'bob@example.com', status: 'pending', signupDate: Date.now() - 86400000 * 2, canGenerateStory: true, canGenerateIllustration: true, canExportPdf: true, canExportGif: true, canExportVideo: true, storyGenerationLimit: 10, illustrationGenerationLimit: 10 },
  { id: 'user-3', name: 'Charlie Cat', email: 'charlie@example.com', status: 'approved', signupDate: Date.now() - 86400000 * 10, canGenerateStory: false, canGenerateIllustration: true, canExportPdf: false, canExportGif: true, canExportVideo: true, storyGenerationLimit: 0, illustrationGenerationLimit: null },
  { id: 'user-4', name: 'Diana Dreamer', email: 'diana@example.com', status: 'pending', signupDate: Date.now() - 86400000 * 1, canGenerateStory: true, canGenerateIllustration: false, canExportPdf: true, canExportGif: false, canExportVideo: false, storyGenerationLimit: null, illustrationGenerationLimit: 0 },
];

type AdminDataSource = 'localStorage' | 'csv' | 'firebase' | 'customApi';
const ADMIN_PASSWORD = "adminpassword123"; 

interface CurrentUserAccessState {
  canGenerateStory: boolean;
  canGenerateIllustration: boolean;
  canExportPdf: boolean;
  canExportGif: boolean;
  canExportVideo: boolean;
  storyGenerationLimit: string; // Use string for input, parse to number or null
  illustrationGenerationLimit: string; // Use string for input, parse to number or null
}

export default function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [storyHistory, setStoryHistory] = useState<StoryRecord[]>([]);
  const [publishedBlogs, setPublishedBlogs] = useState<StoryRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { toast } = useToast();

  const [selectedDataSource, setSelectedDataSource] = useState<AdminDataSource>('localStorage');
  const [firebaseConfigJson, setFirebaseConfigJson] = useState('');
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [aiServiceApiKey, setAiServiceApiKey] = useState('');

  // Global limitations (still used by main page for simplicity)
  const [limitStoryGeneration, setLimitStoryGeneration] = useState(false);
  const [limitIllustrationGeneration, setLimitIllustrationGeneration] = useState(false);
  const [limitPdfExport, setLimitPdfExport] = useState(false);
  const [limitGifExport, setLimitGifExport] = useState(false);
  const [limitVideoExport, setLimitVideoExport] = useState(false);

  // For editing individual user access
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [isUserAccessDialogOpen, setIsUserAccessDialogOpen] = useState(false);
  const [currentUserAccess, setCurrentUserAccess] = useState<CurrentUserAccessState>({
    canGenerateStory: true,
    canGenerateIllustration: true,
    canExportPdf: true,
    canExportGif: true,
    canExportVideo: true,
    storyGenerationLimit: '',
    illustrationGenerationLimit: '',
  });


  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('isAdminAuthenticated');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return; 

    setIsLoadingData(true);
    try {
      const storedHistory = localStorage.getItem("storyHistory");
      if (storedHistory) {
        const parsedHistory: StoryRecord[] = JSON.parse(storedHistory);
         setStoryHistory(parsedHistory.map(record => ({
          ...record,
          sentences: record.sentences.map(s => ({
            id: s.id, text: s.text, lang: s.lang, imageUrl: "", // Avoid storing large data URIs in history
            isImageLoading: false, imageError: null, 'data-ai-hint': s['data-ai-hint'],
          }))
        })).sort((a,b) => b.timestamp - a.timestamp));
      }

      const storedBlogs = localStorage.getItem("publishedBlogs");
      if (storedBlogs) {
        const parsedBlogs: StoryRecord[] = JSON.parse(storedBlogs);
        setPublishedBlogs(parsedBlogs.map(record => ({
            ...record,
            sentences: record.sentences.map(s => ({
                id: s.id, text: s.text, lang: s.lang, imageUrl: s.imageUrl || "", 
                isImageLoading: false, imageError: null, 'data-ai-hint': s['data-ai-hint'],
            })),
            comments: record.comments || [],
            likes: record.likes || 0,
        })).sort((a,b) => b.timestamp - a.timestamp));
      }

      let storedUsers = localStorage.getItem("adminUsers");
      if (storedUsers) {
        const parsedUsers: UserRecord[] = JSON.parse(storedUsers);
        setUsers(parsedUsers.map(user => ({
          ...user,
          canGenerateStory: user.canGenerateStory !== undefined ? user.canGenerateStory : true,
          canGenerateIllustration: user.canGenerateIllustration !== undefined ? user.canGenerateIllustration : true,
          canExportPdf: user.canExportPdf !== undefined ? user.canExportPdf : true,
          canExportGif: user.canExportGif !== undefined ? user.canExportGif : true,
          canExportVideo: user.canExportVideo !== undefined ? user.canExportVideo : true,
          storyGenerationLimit: user.storyGenerationLimit !== undefined ? user.storyGenerationLimit : null,
          illustrationGenerationLimit: user.illustrationGenerationLimit !== undefined ? user.illustrationGenerationLimit : null,
        })).sort((a,b) => b.signupDate - a.signupDate));
      } else {
        const sortedInitialUsers = initialUsersSample.map(user => ({
            ...user, // Default values are already in initialUsersSample
        })).sort((a,b) => b.signupDate - a.signupDate);
        setUsers(sortedInitialUsers);
        localStorage.setItem("adminUsers", JSON.stringify(sortedInitialUsers));
      }
      
      // Load global limitations
      setLimitStoryGeneration(localStorage.getItem("adminLimit_storyGeneration") === 'true');
      setLimitIllustrationGeneration(localStorage.getItem("adminLimit_illustrationGeneration") === 'true');
      setLimitPdfExport(localStorage.getItem("adminLimit_pdfExport") === 'true');
      setLimitGifExport(localStorage.getItem("adminLimit_gifExport") === 'true');
      setLimitVideoExport(localStorage.getItem("adminLimit_videoExport") === 'true');

      // Load site settings
      const storedSettingsDataSource = localStorage.getItem("adminSiteSettings_dataSource") as AdminDataSource | null;
      if (storedSettingsDataSource) setSelectedDataSource(storedSettingsDataSource);
      const storedFirebaseConfig = localStorage.getItem("adminSiteSettings_firebaseConfig");
      if (storedFirebaseConfig) setFirebaseConfigJson(storedFirebaseConfig);
      const storedCustomApiUrl = localStorage.getItem("adminSiteSettings_customApiUrl");
      if (storedCustomApiUrl) setCustomApiUrl(storedCustomApiUrl);
      const storedCustomApiKey = localStorage.getItem("adminSiteSettings_customApiKey");
      if (storedCustomApiKey) setCustomApiKey(storedCustomApiKey);
      const storedAiServiceApiKey = localStorage.getItem("adminSiteSettings_aiServiceApiKey");
      if (storedAiServiceApiKey) setAiServiceApiKey(storedAiServiceApiKey);

    } catch (e) {
      console.error("Error loading data from localStorage for admin:", e);
      toast({
        variant: "destructive",
        title: "Error Loading Data",
        description: "Could not load data from local storage.",
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [toast, isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('isAdminAuthenticated', 'true');
      setLoginError(null);
    } else {
      setLoginError("Incorrect password. Please try again.");
      setPasswordInput("");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('isAdminAuthenticated');
    setPasswordInput("");
    setLoginError(null);
  };

  const saveSiteSettings = () => {
    localStorage.setItem("adminSiteSettings_dataSource", selectedDataSource);
    localStorage.setItem("adminSiteSettings_firebaseConfig", firebaseConfigJson);
    localStorage.setItem("adminSiteSettings_customApiUrl", customApiUrl);
    localStorage.setItem("adminSiteSettings_customApiKey", customApiKey);
    localStorage.setItem("adminSiteSettings_aiServiceApiKey", aiServiceApiKey);
    toast({ title: "Site Settings Saved", description: "Your configuration preferences have been saved locally." });
  };

  const handleGlobalLimitationChange = (limitationKey: string, value: boolean) => {
    localStorage.setItem(limitationKey, String(value));
    switch (limitationKey) {
      case "adminLimit_storyGeneration": setLimitStoryGeneration(value); break;
      case "adminLimit_illustrationGeneration": setLimitIllustrationGeneration(value); break;
      case "adminLimit_pdfExport": setLimitPdfExport(value); break;
      case "adminLimit_gifExport": setLimitGifExport(value); break;
      case "adminLimit_videoExport": setLimitVideoExport(value); break;
    }
    toast({ title: "Global Limitation Setting Updated", description: "This setting affects general app behavior and is saved locally." });
  };
  
  const openUserAccessDialog = (user: UserRecord) => {
    setEditingUser(user);
    setCurrentUserAccess({
      canGenerateStory: user.canGenerateStory !== undefined ? user.canGenerateStory : true,
      canGenerateIllustration: user.canGenerateIllustration !== undefined ? user.canGenerateIllustration : true,
      canExportPdf: user.canExportPdf !== undefined ? user.canExportPdf : true,
      canExportGif: user.canExportGif !== undefined ? user.canExportGif : true,
      canExportVideo: user.canExportVideo !== undefined ? user.canExportVideo : true,
      storyGenerationLimit: user.storyGenerationLimit !== null && user.storyGenerationLimit !== undefined ? String(user.storyGenerationLimit) : '',
      illustrationGenerationLimit: user.illustrationGenerationLimit !== null && user.illustrationGenerationLimit !== undefined ? String(user.illustrationGenerationLimit) : '',
    });
    setIsUserAccessDialogOpen(true);
  };

  const handleUserAccessInputChange = (key: keyof CurrentUserAccessState, value: string | boolean) => {
    setCurrentUserAccess(prev => ({ ...prev, [key]: value }));
  };

  const saveUserAccessSettings = () => {
    if (!editingUser) return;

    const storyLimit = currentUserAccess.storyGenerationLimit.trim() === '' ? null : parseInt(currentUserAccess.storyGenerationLimit, 10);
    const illustrationLimit = currentUserAccess.illustrationGenerationLimit.trim() === '' ? null : parseInt(currentUserAccess.illustrationGenerationLimit, 10);

    const updatedUserSettings = {
      canGenerateStory: currentUserAccess.canGenerateStory,
      canGenerateIllustration: currentUserAccess.canGenerateIllustration,
      canExportPdf: currentUserAccess.canExportPdf,
      canExportGif: currentUserAccess.canExportGif,
      canExportVideo: currentUserAccess.canExportVideo,
      storyGenerationLimit: isNaN(storyLimit as any) ? null : storyLimit,
      illustrationGenerationLimit: isNaN(illustrationLimit as any) ? null : illustrationLimit,
    };

    setUsers(prevUsers => {
      const updatedUsers = prevUsers.map(user =>
        user.id === editingUser.id
          ? { ...user, ...updatedUserSettings }
          : user
      );
      localStorage.setItem("adminUsers", JSON.stringify(updatedUsers));
      return updatedUsers;
    });
    toast({ title: "User Access Settings Saved", description: `Access controls for ${editingUser.name} updated.` });
    setIsUserAccessDialogOpen(false);
    setEditingUser(null);
  };


  const handleDeleteStory = (storyId: string, type: 'history' | 'published') => {
    if (type === 'history') {
      const updatedHistory = storyHistory.filter(story => story.id !== storyId);
      setStoryHistory(updatedHistory);
      localStorage.setItem("storyHistory", JSON.stringify(updatedHistory));
      toast({ title: "Story Removed", description: "Story removed from history." });
    } else if (type === 'published') {
      const updatedBlogs = publishedBlogs.filter(blog => blog.id !== storyId);
      setPublishedBlogs(updatedBlogs);
      localStorage.setItem("publishedBlogs", JSON.stringify(updatedBlogs));
      toast({ title: "Blog Post Removed", description: "Published blog post removed." });
    }
  };

  const handleDeleteUser = (userId: string) => {
    const updatedUsers = users.filter(user => user.id !== userId);
    setUsers(updatedUsers);
    localStorage.setItem("adminUsers", JSON.stringify(updatedUsers));
    toast({ title: "User Removed", description: `User ${userId} has been removed.` });
  };

  const handleDownloadHistoryCSV = () => {
    if (storyHistory.length === 0) {
      toast({ variant: "destructive", title: "No History", description: "There is no general story history to download." });
      return;
    }
    try {
      const csvString = convertStoryHistoryToCSV(storyHistory);
      downloadBlob(new Blob([csvString], { type: 'text/csv;charset=utf-8;' }), "story_history.csv");
      toast({ title: "CSV Downloaded", description: "Story history has been downloaded as story_history.csv." });
    } catch (error) {
      console.error("Error generating story history CSV:", error);
      toast({ variant: "destructive", title: "CSV Generation Failed", description: "Could not generate story history CSV file." });
    }
  };
  
  const handleDownloadPublishedPostsCSV = () => {
    if (publishedBlogs.length === 0) {
      toast({ variant: "destructive", title: "No Published Posts", description: "There are no published blog posts to download." });
      return;
    }
    try {
      // Assuming published posts use the same StoryRecord structure for CSV conversion
      const csvString = convertStoryHistoryToCSV(publishedBlogs); 
      downloadBlob(new Blob([csvString], { type: 'text/csv;charset=utf-8;' }), "published_posts.csv");
      toast({ title: "CSV Downloaded", description: "Published blog posts have been downloaded as published_posts.csv." });
    } catch (error) {
      console.error("Error generating published posts CSV:", error);
      toast({ variant: "destructive", title: "CSV Generation Failed", description: "Could not generate published posts CSV file." });
    }
  };

  const handleDownloadUsersCSV = () => {
    if (users.length === 0) {
      toast({ variant: "destructive", title: "No Users", description: "There is no user data to download." });
      return;
    }
    try {
      const csvString = convertUsersToCSV(users);
      downloadBlob(new Blob([csvString], { type: 'text/csv;charset=utf-8;' }), "users_data.csv");
      toast({ title: "Users CSV Downloaded", description: "Current user data has been downloaded as users_data.csv." });
    } catch (error) {
      console.error("Error generating users CSV:", error);
      toast({ variant: "destructive", title: "CSV Generation Failed", description: "Could not generate users CSV file." });
    }
  };

  const toggleUserStatus = (userId: string) => {
    setUsers(prevUsers => {
      const updatedUsers = prevUsers.map(user =>
        user.id === userId
          ? { ...user, status: user.status === 'pending' ? 'approved' : 'pending' }
          : user
      );
      localStorage.setItem("adminUsers", JSON.stringify(updatedUsers));
      return updatedUsers;
    });
    toast({ title: "User Status Updated", description: "User status saved to local storage." });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-primary flex items-center justify-center">
              <ShieldAlert className="mr-2 h-6 w-6" />Admin Access Required
            </CardTitle>
            <CardDescription className="text-center">
              Please enter the password to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter admin password"
                  className="bg-card"
                  required
                />
              </div>
              {loginError && (
                <Alert variant="destructive" className="text-xs">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Login Failed</AlertTitle>
                  <AlertDescriptionShadCN>{loginError}</AlertDescriptionShadCN>
                </Alert>
              )}
              <Button type="submit" className="w-full">
                <KeyRound className="mr-2 h-4 w-4" /> Login
              </Button>
            </form>
          </CardContent>
           <CardFooter className="text-xs text-muted-foreground text-center">
            <p>This is a client-side password prompt for prototype purposes. True security requires backend authentication.</p>
          </CardFooter>
        </Card>
      </div>
    );
  }


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">Tiny Tales Weaver</Link>
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-primary/80">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 flex-grow w-full">
        {isLoadingData ? <p className="text-center">Loading admin data...</p> : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><History className="mr-2 h-5 w-5 text-primary" /> Content Management</CardTitle>
              <CardDescription>View story history and published posts from this browser's local storage. Download as CSV or delete.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
               <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full"><History className="mr-2 h-4 w-4" /> View Story History (Local)</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Story History (From Local Storage)</DialogTitle>
                     <DialogDescription>Showing latest {storyHistory.length} stories.</DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="h-[60vh] mt-4 pr-4">
                    {storyHistory.length === 0 ? <p>No stories in local history.</p> :
                      storyHistory.map(story => (
                        <div key={story.id} className="mb-4 p-3 border rounded-md bg-muted/30 hover:shadow-md transition-shadow">
                          <p className="font-semibold text-sm">Prompt: <span className="font-normal">{story.prompt}</span></p>
                          <p className="text-xs text-muted-foreground">ID: {story.id}</p>
                          <p className="text-xs text-muted-foreground">Language: {story.language} | {new Date(story.timestamp).toLocaleString()}</p>
                          <div className="mt-2 flex justify-between items-center">
                            <Link href={`/?prompt=${encodeURIComponent(story.prompt)}&language=${story.language}`} passHref>
                               <Button size="sm" variant="link" className="p-0 h-auto text-primary text-xs">
                                  Reload on Main Page <ExternalLink className="ml-1 h-3 w-3"/>
                               </Button>
                            </Link>
                             <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive/80 p-1 h-auto">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action will permanently delete this story from your local history. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteStory(story.id, 'history')} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))
                    }
                  </ScrollArea>
                </DialogContent>
              </Dialog>
               <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full"><Edit3 className="mr-2 h-4 w-4" /> View Published Posts (Local)</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Published Blog Posts (From Local Storage)</DialogTitle>
                     <DialogDescription>Showing latest {publishedBlogs.length} posts.</DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="h-[60vh] mt-4 pr-4">
                    {publishedBlogs.length === 0 ? <p>No posts published in local storage.</p> :
                      publishedBlogs.map(blog => (
                        <div key={blog.id} className="mb-4 p-3 border rounded-md bg-muted/30 hover:shadow-md transition-shadow">
                          <p className="font-semibold text-sm">Title: <span className="font-normal">{blog.prompt}</span></p>
                          <p className="text-xs text-muted-foreground">ID: {blog.id}</p>
                          <p className="text-xs text-muted-foreground">Language: {blog.language} | Published: {new Date(blog.timestamp).toLocaleString()}</p>
                           <p className="text-xs text-muted-foreground">Likes: {blog.likes || 0} | Comments: {blog.comments?.length || 0}</p>
                           <div className="mt-2 flex justify-end">
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive/80 p-1 h-auto">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action will permanently delete this published post from your local storage. This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteStory(blog.id, 'published')} className="bg-destructive hover:bg-destructive/90">Delete Post</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                        </div>
                      ))
                    }
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button onClick={handleDownloadHistoryCSV} className="w-full" disabled={storyHistory.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Download Story History CSV
              </Button>
              <Button onClick={handleDownloadPublishedPostsCSV} className="w-full" disabled={publishedBlogs.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Download Published Posts CSV
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary" /> User Management</CardTitle>
              <CardDescription>View users. Data, approvals, and per-user feature access (including numeric limits) are managed in this browser's local storage. Download list as CSV or delete users.</CardDescription>
            </CardHeader>
            <CardContent>
               <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full"><Users className="mr-2 h-4 w-4" /> View Users</Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl"> {/* Increased width for more columns */}
                  <DialogHeader>
                    <DialogTitle>User List (Managed in Local Storage)</DialogTitle>
                    <DialogDescription>Showing {users.length} users. Sorted by signup date (newest first).</DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="h-[60vh] mt-4 pr-4">
                    {users.length === 0 ? <p>No user data. Sample data will load on next refresh if empty.</p> : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Signup Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map(user => (
                          <TableRow key={user.id}>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.status === 'approved' ? 'default' : 'secondary'} className={user.status === 'approved' ? 'bg-green-500/20 text-green-700 border-green-500/30' : 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30'}>
                                {user.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(user.signupDate).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => toggleUserStatus(user.id)}
                                className="h-7 px-2 py-1"
                              >
                                {user.status === 'pending' ? 
                                  <><CheckCircle className="mr-1 h-3 w-3 text-green-500"/>Approve</> : 
                                  <><XCircle className="mr-1 h-3 w-3 text-orange-500"/>Unapprove</>
                                }
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openUserAccessDialog(user)} className="h-7 px-2 py-1">
                                <Edit className="mr-1 h-3 w-3" /> Access
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive/80 h-7 px-2 py-1">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User: {user.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action will permanently delete this user from your local storage. This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90">Delete User</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </CardContent>
             <CardFooter className="flex flex-col space-y-2">
                <Button onClick={handleDownloadUsersCSV} className="w-full" disabled={users.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Download Users CSV
                </Button>
                 <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700 text-xs mt-2">
                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                    User data, including per-user feature access and numeric limits, is managed in this browser's local storage. Main app currently uses global settings for feature limitations.
                </div>
            </CardFooter>
          </Card>

          {/* Dialog for Editing User Access Controls */}
          <Dialog open={isUserAccessDialogOpen} onOpenChange={setIsUserAccessDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Access for {editingUser?.name}</DialogTitle>
                <DialogDescription>
                  Toggle features this user can access and set numeric limits. These settings are stored locally.
                  Numeric limits are for configuration/export; main app uses global switches for now.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="user-canGenerateStory" className="flex-1">Allow Story Generation</Label>
                  <Switch id="user-canGenerateStory" checked={currentUserAccess.canGenerateStory} onCheckedChange={(val) => handleUserAccessInputChange('canGenerateStory', val)} />
                </div>
                {currentUserAccess.canGenerateStory && (
                  <div className="grid grid-cols-3 items-center gap-4 pl-4">
                    <Label htmlFor="user-storyGenLimit" className="col-span-2">Story Gen Limit (e.g., 10)</Label>
                    <Input id="user-storyGenLimit" type="number" placeholder="No limit" value={currentUserAccess.storyGenerationLimit} onChange={(e) => handleUserAccessInputChange('storyGenerationLimit', e.target.value)} className="col-span-1 h-8 text-sm" />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label htmlFor="user-canGenerateIllustration" className="flex-1">Allow Illustration Generation</Label>
                  <Switch id="user-canGenerateIllustration" checked={currentUserAccess.canGenerateIllustration} onCheckedChange={(val) => handleUserAccessInputChange('canGenerateIllustration', val)} />
                </div>
                 {currentUserAccess.canGenerateIllustration && (
                  <div className="grid grid-cols-3 items-center gap-4 pl-4">
                    <Label htmlFor="user-illustrationGenLimit" className="col-span-2">Illustration Gen Limit (e.g., 20)</Label>
                    <Input id="user-illustrationGenLimit" type="number" placeholder="No limit" value={currentUserAccess.illustrationGenerationLimit} onChange={(e) => handleUserAccessInputChange('illustrationGenerationLimit', e.target.value)} className="col-span-1 h-8 text-sm" />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label htmlFor="user-canExportPdf">Allow PDF Export</Label>
                  <Switch id="user-canExportPdf" checked={currentUserAccess.canExportPdf} onCheckedChange={(val) => handleUserAccessInputChange('canExportPdf', val)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="user-canExportGif">Allow GIF Creation</Label>
                  <Switch id="user-canExportGif" checked={currentUserAccess.canExportGif} onCheckedChange={(val) => handleUserAccessInputChange('canExportGif', val)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="user-canExportVideo">Allow Video Export</Label>
                  <Switch id="user-canExportVideo" checked={currentUserAccess.canExportVideo} onCheckedChange={(val) => handleUserAccessInputChange('canExportVideo', val)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUserAccessDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveUserAccessSettings}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>


          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Settings className="mr-2 h-5 w-5 text-primary" /> Site Settings</CardTitle>
              <CardDescription>Configure conceptual data sources and API keys. Settings saved to local storage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-semibold mb-2 block">Data Source Configuration (Conceptual)</Label>
                <RadioGroup value={selectedDataSource} onValueChange={(value) => setSelectedDataSource(value as AdminDataSource)}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="localStorage" id="ds-localstorage" />
                    <Label htmlFor="ds-localstorage" className="font-normal flex items-center"><Database className="mr-2 h-4 w-4 text-muted-foreground"/> Browser LocalStorage (Default)</Label>
                  </div>
                   <p className="text-xs text-muted-foreground pl-6 mb-3">App data (users, posts) is stored in this browser.</p>
                  
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="csv" id="ds-csv" />
                    <Label htmlFor="ds-csv" className="font-normal flex items-center"><Download className="mr-2 h-4 w-4 text-muted-foreground"/> CSV Files (Manual Data Management)</Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6 mb-3">Implies data managed via manual CSV import/export (downloads are available).</p>

                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="firebase" id="ds-firebase" />
                    <Label htmlFor="ds-firebase" className="font-normal flex items-center"><Cloud className="mr-2 h-4 w-4 text-muted-foreground"/> Firebase (Future Integration)</Label>
                  </div>
                  {selectedDataSource === 'firebase' && (
                    <div className="pl-6 space-y-2 mb-3">
                      <Label htmlFor="firebaseConfig" className="text-xs">Firebase Config JSON:</Label>
                      <Textarea id="firebaseConfig" placeholder="Paste Firebase config JSON here..." value={firebaseConfigJson} onChange={(e) => setFirebaseConfigJson(e.target.value)} className="text-xs h-24 bg-card" />
                    </div>
                  )}

                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="customApi" id="ds-customapi" />
                    <Label htmlFor="ds-customapi" className="font-normal flex items-center"><Cloud className="mr-2 h-4 w-4 text-muted-foreground"/> Custom API (Future Integration)</Label>
                  </div>
                  {selectedDataSource === 'customApi' && (
                    <div className="pl-6 space-y-2 mb-3">
                      <Label htmlFor="customApiUrl" className="text-xs">API URL:</Label>
                      <Input id="customApiUrl" placeholder="https://your-api.com/data" value={customApiUrl} onChange={(e) => setCustomApiUrl(e.target.value)} className="text-xs h-9 bg-card" />
                      <Label htmlFor="customApiKey" className="text-xs">API Key:</Label>
                      <Input id="customApiKey" type="password" placeholder="Your Custom API Key" value={customApiKey} onChange={(e) => setCustomApiKey(e.target.value)} className="text-xs h-9 bg-card" />
                    </div>
                  )}
                </RadioGroup>
              </div>
              <hr/>
              <div>
                <Label className="text-base font-semibold mb-2 block flex items-center"><Brain className="mr-2 h-4 w-4 text-muted-foreground"/>AI Service Configuration</Label>
                <Label htmlFor="aiServiceApiKey" className="text-xs">AI Service API Key (e.g., for Genkit on a custom backend - Optional Override):</Label>
                <Input id="aiServiceApiKey" type="password" placeholder="Your AI Service API Key" value={aiServiceApiKey} onChange={(e) => setAiServiceApiKey(e.target.value)} className="text-xs h-9 mt-1 bg-card"/>
                 <p className="text-xs text-muted-foreground mt-1">Genkit uses environment variables by default. This is a placeholder for potential future custom configurations.</p>
              </div>
            </CardContent>
             <CardFooter className="flex-col space-y-2">
                <Button onClick={saveSiteSettings} className="w-full">
                    <KeyRound className="mr-2 h-4 w-4" /> Save Site Settings
                </Button>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700 text-xs mt-2">
                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                    These settings are for conceptual planning and are saved in your browser. Full backend integration would be required for these to control a live application.
                </div>
            </CardFooter>
          </Card>
          
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center"><Lock className="mr-2 h-5 w-5 text-primary" /> Global Feature Access Control (For Main App)</CardTitle>
              <CardDescription>
                These global settings limit features for all users on the main application page. They are saved locally.
                Per-user settings (managed under "User Management") are for data export and future backend integration where numeric limits can be enforced.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/20">
                <Switch id="limitStoryGen" checked={limitStoryGeneration} onCheckedChange={(val) => handleGlobalLimitationChange("adminLimit_storyGeneration", val)} />
                <Label htmlFor="limitStoryGen" className="font-normal">Limit Story Generation</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/20">
                <Switch id="limitIllustrationGen" checked={limitIllustrationGeneration} onCheckedChange={(val) => handleGlobalLimitationChange("adminLimit_illustrationGeneration", val)} />
                <Label htmlFor="limitIllustrationGen" className="font-normal">Limit Illustration Generation</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/20">
                <Switch id="limitPdfExport" checked={limitPdfExport} onCheckedChange={(val) => handleGlobalLimitationChange("adminLimit_pdfExport", val)} />
                <Label htmlFor="limitPdfExport" className="font-normal">Limit PDF Export</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/20">
                <Switch id="limitGifExport" checked={limitGifExport} onCheckedChange={(val) => handleGlobalLimitationChange("adminLimit_gifExport", val)} />
                <Label htmlFor="limitGifExport" className="font-normal">Limit GIF Creation</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/20">
                <Switch id="limitVideoExport" checked={limitVideoExport} onCheckedChange={(val) => handleGlobalLimitationChange("adminLimit_videoExport", val)} />
                <Label htmlFor="limitVideoExport" className="font-normal">Limit Video Export</Label>
              </div>
            </CardContent>
            <CardFooter>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700 text-xs mt-2 w-full">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                These global limitations affect the main app page for users and are stored in this browser. Per-user numeric limits are configured above but not yet enforced on the main app.
              </div>
            </CardFooter>
          </Card>

        </div>
        )}
      </main>
      <footer className="text-center py-4 border-t text-sm text-muted-foreground">
        Tiny Tales Weaver - Admin Panel
      </footer>
    </div>
  );
}

