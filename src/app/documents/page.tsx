
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/header';
import { ArrowLeft, FileQuestion, RefreshCcw, Link, Loader2, Share2, FileSpreadsheet, FileText } from 'lucide-react';
import Image from 'next/image';
import { updateRecipientDocumentsAction, getStaticFilesStatusAction, saveStaticDocumentLinksAction } from '@/app/actions/document-actions';

type UploadableFile = 'inventory' | 'instructions';
type FileStatus = { name: string; url: string, iconLink?: string } | null;
type PickerFileType = 'spreadsheet' | 'document';

// Extend Window interface to include gapi and google objects
declare global {
  interface Window {
    gapi: any;
    google: any;
    tokenClient: any;
  }
}

export default function ManageDocumentsPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetchingStatus, setIsFetchingStatus] = useState(true);
  const [isPickerReady, setIsPickerReady] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const [currentFiles, setCurrentFiles] = useState<Record<UploadableFile, FileStatus>>({
    inventory: null,
    instructions: null,
  });

  const router = useRouter();
  const { toast } = useToast();

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const SCOPES = "https://www.googleapis.com/auth/drive.readonly";
  
  const fetchFileStatus = useCallback(async () => {
    setIsFetchingStatus(true);
    const result = await getStaticFilesStatusAction();
    if (result.success && result.data) {
      setCurrentFiles(result.data as Record<UploadableFile, FileStatus>);
    } else {
      toast({ variant: 'destructive', title: 'Could not fetch file statuses', description: result.error });
    }
    setIsFetchingStatus(false);
  }, [toast]);

  // --- Google Picker API Logic ---
  const loadGapi = useCallback(() => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => window.gapi.load('client:picker', initializePicker);
    document.body.appendChild(script);
  }, []);

  const initializePicker = useCallback(() => {
    window.gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest')
      .then(() => setIsPickerReady(true))
      .catch((err: any) => {
        console.error("Error loading drive client:", err);
        toast({ variant: 'destructive', title: 'Picker Error', description: 'Could not load Google Drive client.'});
      });
  }, [toast]);
  
  const loadGis = useCallback(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
        window.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // defined later
        });
    };
    document.body.appendChild(script);
  }, [CLIENT_ID]);

  useEffect(() => {
    fetchFileStatus();
    loadGapi();
    loadGis();
  }, [fetchFileStatus, loadGapi, loadGis]);

  const handleAuthClick = (fileType: UploadableFile, pickerFileType: PickerFileType) => {
    if (!API_KEY || !CLIENT_ID) {
      toast({ variant: 'destructive', title: 'Configuration Missing', description: 'Google API Key or Client ID is not configured.' });
      return;
    }
    if (window.gapi?.client?.getToken() === null) {
      window.tokenClient.callback = async (resp: any) => {
        if (resp.error !== undefined) {
          throw (resp);
        }
        createPicker(fileType, pickerFileType);
      };
      window.tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
      createPicker(fileType, pickerFileType);
    }
  }

  const createPicker = (fileType: UploadableFile, pickerFileType: PickerFileType) => {
    if (isPickerOpen) return;
    setIsPickerOpen(true);

    const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
    if(pickerFileType === 'spreadsheet') {
      view.setMimeTypes("application/vnd.google-apps.spreadsheet");
    } else {
      view.setMimeTypes("application/vnd.google-apps.document,application/pdf");
    }

    const picker = new window.google.picker.PickerBuilder()
      .setAppId(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!)
      .setApiKey(API_KEY!)
      .setOAuthToken(window.gapi.client.getToken().access_token)
      .addView(view)
      .addView(new window.google.picker.DocsUploadView())
      .setDeveloperKey(API_KEY!)
      .setCallback(async (data: any) => {
          setIsPickerOpen(false);
          if (data.action === window.google.picker.Action.PICKED) {
              const doc = data.docs[0];
              const fileData = {
                  fileType: fileType,
                  url: doc.url,
                  name: doc.name,
                  iconLink: doc.iconUrl
              };
              
              const result = await saveStaticDocumentLinksAction(fileData);

              if (result.success) {
                  toast({ title: 'Link Saved', description: result.message });
                  await fetchFileStatus();
              } else {
                  toast({ variant: 'destructive', title: 'Failed to Save Link', description: result.error });
              }
          }
      })
      .build();
    picker.setVisible(true);
  }

  const handleSyncLinks = async () => {
    setIsSyncing(true);
    const result = await updateRecipientDocumentsAction();
    setIsSyncing(false);

    if (result.success) {
      toast({ title: 'Sync Successful', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Sync Failed', description: result.error });
    }
  };

  const renderFileStatus = (fileType: UploadableFile, pickerFileType: PickerFileType, icon: React.ReactNode, title: string, description: string) => {
    const file = currentFiles[fileType];
    const isPickerLoading = !isPickerReady || isPickerOpen;
    return (
       <Card className="lg:col-span-1 flex flex-col">
          <CardHeader>
              <CardTitle className="flex items-center gap-2">{icon} {title}</CardTitle>
              <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-grow">
              <div className="p-3 bg-muted/50 rounded-lg text-sm min-h-[60px] flex items-center">
                {isFetchingStatus ? (
                    <div className="flex items-center space-x-2 text-muted-foreground w-full">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Checking status...</span>
                    </div>
                ) : file && file.url ? (
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2 truncate">
                      {file.iconLink && <Image src={file.iconLink} alt="file icon" width={16} height={16} />}
                      <span className="font-medium truncate pr-2">{file.name}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-muted-foreground w-full">
                        <FileQuestion className="h-4 w-4" />
                        <span>No file link saved yet.</span>
                    </div>
                )}
              </div>
          </CardContent>
          <CardFooter>
              <Button onClick={() => handleAuthClick(fileType, pickerFileType)} disabled={isPickerLoading} className="w-full">
                   {isPickerLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                   Choose from Google Drive
              </Button>
          </CardFooter>
      </Card>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Manage Static Documents</h1>
            <Button variant="ghost" size="icon" onClick={fetchFileStatus} disabled={isFetchingStatus}>
                <RefreshCcw className={`h-4 w-4 ${isFetchingStatus ? 'animate-spin' : ''}`} />
            </Button>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto">
            {renderFileStatus('inventory', 'spreadsheet', <FileSpreadsheet />, '1. Set Inventory File', 'Choose the inventory file (Google Sheet) from your Google Drive.')}
            {renderFileStatus('instructions', 'document', <FileText />, '2. Set Instructions File', 'Choose the instructions file (Google Doc or PDF) from your Google Drive.')}

            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>3. Sync Links to Recipients</CardTitle>
                    <CardDescription>
                        Run this action to link the saved Google Drive file URLs to all existing recipients in the database.
                        This will only sync files that have been successfully saved.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                       This process will update all recipient records. If a link is updated later, you must run this sync again to update the links for all recipients.
                    </p>
                </CardContent>
                 <CardFooter>
                    <Button onClick={handleSyncLinks} disabled={isSyncing} className="w-full">
                        {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link className="mr-2 h-4 w-4" />}
                        {isSyncing ? 'Syncing...' : 'Sync Links to All Recipients'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </main>
    </div>
  );
}
