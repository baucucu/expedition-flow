
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/header';
import { ArrowLeft, FileScan, Loader2, Save, ExternalLink, FileQuestion, RefreshCcw, Link } from 'lucide-react';
import { updateRecipientDocumentsAction, getStaticFilesStatusAction, saveStaticDocumentLinksAction } from '@/app/actions/document-actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type UploadableFile = 'inventory' | 'instructions';
type FileStatus = { name: string; url: string } | null;

export default function ManageDocumentsPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetchingStatus, setIsFetchingStatus] = useState(true);

  const [inventoryLink, setInventoryLink] = useState('');
  const [instructionsLink, setInstructionsLink] = useState('');

  const [currentFiles, setCurrentFiles] = useState<Record<UploadableFile, FileStatus>>({
    inventory: null,
    instructions: null,
  });
  
  const [saveStatus, setSaveStatus] = useState<Record<UploadableFile, 'idle' | 'saving' | 'success' | 'error'>>({ inventory: 'idle', instructions: 'idle' });

  const router = useRouter();
  const { toast } = useToast();

  const fetchFileStatus = useCallback(async () => {
    setIsFetchingStatus(true);
    const result = await getStaticFilesStatusAction();
    if (result.success && result.data) {
        setCurrentFiles(result.data as Record<UploadableFile, FileStatus>);
        setInventoryLink(result.data.inventory?.url || '');
        setInstructionsLink(result.data.instructions?.url || '');
    } else {
        toast({ variant: 'destructive', title: 'Could not fetch file statuses', description: result.error });
    }
    setIsFetchingStatus(false);
  }, [toast]);

  useEffect(() => {
    fetchFileStatus();
  }, [fetchFileStatus]);

  const handleSaveLink = async (fileType: UploadableFile) => {
    const url = fileType === 'inventory' ? inventoryLink : instructionsLink;
    if (!url) {
        toast({ variant: 'destructive', title: 'No Link Provided', description: 'Please paste a valid Google Drive link.'});
        return;
    }

    setSaveStatus(prev => ({ ...prev, [fileType]: 'saving' }));
    const result = await saveStaticDocumentLinksAction({ fileType, url });

    if (result.success) {
        setSaveStatus(prev => ({ ...prev, [fileType]: 'success' }));
        toast({ title: 'Link Saved', description: result.message });
        await fetchFileStatus();
    } else {
        setSaveStatus(prev => ({ ...prev, [fileType]: 'error' }));
        toast({ variant: 'destructive', title: 'Failed to Save Link', description: result.error });
    }
  };


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

  const isSaving = (fileType: UploadableFile) => saveStatus[fileType] === 'saving';

  const renderFileStatus = (fileType: UploadableFile) => {
    const file = currentFiles[fileType];
    return (
      <div className="p-3 bg-muted/50 rounded-lg text-sm">
        {isFetchingStatus ? (
             <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking status...</span>
            </div>
        ) : file && file.url ? (
          <div className="flex justify-between items-center">
            <span className="font-medium truncate pr-2">{file.name}</span>
            <Button size="sm" variant="outline" asChild>
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                    Review File
                    <ExternalLink className="ml-2 h-4 w-4" />
                </a>
            </Button>
          </div>
        ) : (
           <div className="flex items-center space-x-2 text-muted-foreground">
                <FileQuestion className="h-4 w-4" />
                <span>No file link saved yet.</span>
            </div>
        )}
      </div>
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
            
            <Card className="lg:col-span-1 flex flex-col">
                 <CardHeader>
                    <CardTitle>1. Set Inventory File Link</CardTitle>
                    <CardDescription>Paste the Google Drive share link for the inventory file (e.g., a Google Sheet).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                     {renderFileStatus('inventory')}
                     <div className="space-y-2">
                        <Label htmlFor="inventory-link">Google Drive Link</Label>
                        <Input id="inventory-link" type="url" placeholder="https://docs.google.com/spreadsheets/d/..." value={inventoryLink} onChange={(e) => setInventoryLink(e.target.value)} disabled={isSaving('inventory')} />
                     </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => handleSaveLink('inventory')} disabled={isSaving('inventory')} className="w-full">
                        {isSaving('inventory') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isSaving('inventory') ? 'Saving...' : 'Save Inventory Link'}
                    </Button>
                </CardFooter>
            </Card>

            <Card className="lg:col-span-1 flex flex-col">
                 <CardHeader>
                    <CardTitle>2. Set Instructions File Link</CardTitle>
                    <CardDescription>Paste the Google Drive share link for the instructions file (e.g., a Google Doc or PDF).</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4 flex-grow">
                     {renderFileStatus('instructions')}
                     <div className="space-y-2">
                        <Label htmlFor="instructions-link">Google Drive Link</Label>
                        <Input id="instructions-link" type="url" placeholder="https://docs.google.com/document/d/..." value={instructionsLink} onChange={(e) => setInstructionsLink(e.target.value)} disabled={isSaving('instructions')} />
                     </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => handleSaveLink('instructions')} disabled={isSaving('instructions')} className="w-full">
                        {isSaving('instructions') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                         {isSaving('instructions') ? 'Saving...' : 'Save Instructions Link'}
                    </Button>
                </CardFooter>
            </Card>


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
