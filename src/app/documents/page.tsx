
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/header';
import { ArrowLeft, FileQuestion, RefreshCcw, Link as LinkIcon, Loader2, FileSpreadsheet, FileText, Save } from 'lucide-react';
import { updateRecipientDocumentsAction, getStaticFilesStatusAction, saveStaticDocumentLinksAction } from '@/app/actions/document-actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FileType = 'inventory' | 'instructions';
type FileStatus = { fileId: string | null };

export default function ManageDocumentsPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetchingStatus, setIsFetchingStatus] = useState(true);
  const [isSaving, setIsSaving] = useState<FileType | null>(null);

  const [currentFiles, setCurrentFiles] = useState<Record<FileType, FileStatus>>({
    inventory: { fileId: null },
    instructions: { fileId: null },
  });
  
  const [fileIdInputs, setFileIdInputs] = useState<Record<FileType, string>>({
    inventory: '',
    instructions: '',
  });

  const router = useRouter();
  const { toast } = useToast();
  
  const fetchFileStatus = useCallback(async () => {
    setIsFetchingStatus(true);
    const result = await getStaticFilesStatusAction();
    if (result.success && result.data) {
      const fetchedData = result.data as Record<FileType, FileStatus>;
      setCurrentFiles(fetchedData);
      setFileIdInputs({
        inventory: fetchedData.inventory?.fileId || '',
        instructions: fetchedData.instructions?.fileId || '',
      });
    } else {
      toast({ variant: 'destructive', title: 'Could not fetch file statuses', description: result.error });
    }
    setIsFetchingStatus(false);
  }, [toast]);

  useEffect(() => {
    fetchFileStatus();
  }, [fetchFileStatus]);


  const handleSaveFileId = async (fileType: FileType) => {
    const fileId = fileIdInputs[fileType];
    if (!fileId) {
        toast({ variant: 'destructive', title: 'Input missing', description: 'Please provide a Google Drive File ID.' });
        return;
    }
    setIsSaving(fileType);
    const result = await saveStaticDocumentLinksAction({ fileType, fileId });
    setIsSaving(null);
    if (result.success) {
        toast({ title: 'File ID Saved', description: result.message });
        await fetchFileStatus();
    } else {
        toast({ variant: 'destructive', title: 'Failed to Save ID', description: result.error });
    }
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
  
  const handleInputChange = (fileType: FileType, value: string) => {
      setFileIdInputs(prev => ({...prev, [fileType]: value}));
  }

  const renderFileStatusCard = (fileType: FileType, icon: React.ReactNode, title: string, description: string) => {
    const file = currentFiles[fileType];
    const isCurrentlySaving = isSaving === fileType;

    return (
       <Card className="lg:col-span-1 flex flex-col">
          <CardHeader>
              <CardTitle className="flex items-center gap-2">{icon} {title}</CardTitle>
              <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-grow">
              <div className="space-y-2">
                <Label htmlFor={`${fileType}-id-input`}>Google Drive File ID</Label>
                <Input 
                    id={`${fileType}-id-input`}
                    placeholder="Paste your File ID here"
                    value={fileIdInputs[fileType]}
                    onChange={(e) => handleInputChange(fileType, e.target.value)}
                    disabled={isFetchingStatus}
                />
              </div>
               <div className="p-3 bg-muted/50 rounded-lg text-sm min-h-[60px] flex items-center">
                {isFetchingStatus ? (
                    <div className="flex items-center space-x-2 text-muted-foreground w-full">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Checking status...</span>
                    </div>
                ) : file && file.fileId ? (
                  <div className="flex justify-between items-center w-full">
                    <span className="font-medium truncate pr-2 text-green-700">File ID is saved.</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-muted-foreground w-full">
                        <FileQuestion className="h-4 w-4" />
                        <span>No file ID saved yet.</span>
                    </div>
                )}
              </div>
          </CardContent>
          <CardFooter>
              <Button onClick={() => handleSaveFileId(fileType)} disabled={isCurrentlySaving || isFetchingStatus} className="w-full">
                   {isCurrentlySaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                   {isCurrentlySaving ? 'Saving...' : 'Save File ID'}
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
            {renderFileStatusCard('inventory', <FileSpreadsheet />, '1. Set Inventory File', 'Provide the Google Drive File ID for the inventory sheet.')}
            {renderFileStatusCard('instructions', <FileText />, '2. Set Instructions File', 'Provide the Google Drive File ID for the instructions document.')}

            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>3. Sync File IDs to Recipients</CardTitle>
                    <CardDescription>
                        Run this action to link the saved Google Drive files to all existing recipients in the database.
                        This will only sync files that have a saved File ID.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                       This process will update all recipient records. If a File ID is updated later, you must run this sync again to update the links for all recipients.
                    </p>
                </CardContent>
                 <CardFooter>
                    <Button onClick={handleSyncLinks} disabled={isSyncing} className="w-full">
                        {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                        {isSyncing ? 'Syncing...' : 'Sync to All Recipients'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </main>
    </div>
  );
}
