
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/header';
import { ArrowLeft, FileScan, Loader2, Upload, FileCheck2, AlertCircle, ExternalLink, FileQuestion, RefreshCcw } from 'lucide-react';
import { updateRecipientDocumentsAction, uploadStaticFileAction, getStaticFilesStatusAction } from '@/app/actions/expedition-actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type UploadableFile = 'inventory' | 'instructions' | 'procesVerbal';
type FileStatus = { name: string; url: string } | null;

export default function ManageDocumentsPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetchingStatus, setIsFetchingStatus] = useState(true);

  const [inventoryFile, setInventoryFile] = useState<File | null>(null);
  const [instructionsFile, setInstructionsFile] = useState<File | null>(null);
  const [procesVerbalFile, setProcesVerbalFile] = useState<File | null>(null);

  const [currentFiles, setCurrentFiles] = useState<Record<UploadableFile, FileStatus>>({
    inventory: null,
    instructions: null,
    procesVerbal: null,
  });
  
  const [uploadStatus, setUploadStatus] = useState<Record<UploadableFile, 'idle' | 'uploading' | 'success' | 'error'>>({ inventory: 'idle', instructions: 'idle', procesVerbal: 'idle' });
  const [uploadError, setUploadError] = useState<Record<UploadableFile, string | null>>({ inventory: null, instructions: null, procesVerbal: null });

  const router = useRouter();
  const { toast } = useToast();

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

  useEffect(() => {
    fetchFileStatus();
  }, [fetchFileStatus]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: UploadableFile) => {
    const file = e.target.files?.[0] ?? null;
    
    setUploadStatus(prev => ({...prev, [fileType]: 'idle'}));
    setUploadError(prev => ({...prev, [fileType]: null}));

    if (fileType === 'inventory') setInventoryFile(file);
    else if (fileType === 'instructions') setInstructionsFile(file);
    else setProcesVerbalFile(file);
  };

  const handleUpload = async (fileType: UploadableFile) => {
    let file: File | null = null;
    if (fileType === 'inventory') file = inventoryFile;
    else if (fileType === 'instructions') file = instructionsFile;
    else file = procesVerbalFile;

    if (!file) {
      toast({ variant: 'destructive', title: 'No file selected' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);
    
    setUploadStatus(prev => ({...prev, [fileType]: 'uploading'}));
    setUploadError(prev => ({...prev, [fileType]: null}));

    const result = await uploadStaticFileAction(formData);

    if (result.success) {
      setUploadStatus(prev => ({...prev, [fileType]: 'success'}));
      toast({ title: 'Upload Successful', description: result.message });
      await fetchFileStatus(); // Refresh file status after upload
    } else {
      const errorMessage = result.error || 'An unknown error occurred.';
      setUploadStatus(prev => ({...prev, [fileType]: 'error'}));
      setUploadError(prev => ({...prev, [fileType]: errorMessage}));
      toast({ variant: 'destructive', title: 'Upload Failed', description: errorMessage });
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

  const isUploading = (fileType: UploadableFile) => uploadStatus[fileType] === 'uploading';

  const renderFileStatus = (fileType: UploadableFile) => {
    const file = currentFiles[fileType];
    return (
      <div className="p-3 bg-muted/50 rounded-lg text-sm">
        {isFetchingStatus ? (
             <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking status...</span>
            </div>
        ) : file ? (
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
                <span>No file uploaded yet.</span>
            </div>
        )}
      </div>
    );
  }

  const renderUploadStatus = (fileType: UploadableFile) => {
    if (uploadStatus[fileType] === 'uploading') {
        return <div className="flex items-center space-x-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>Uploading...</span></div>
    }
    if (uploadStatus[fileType] === 'success') {
         return <div className="text-sm text-green-600 flex items-center gap-2"><FileCheck2 className="h-4 w-4" /><span>Upload complete.</span></div>
    }
    if (uploadStatus[fileType] === 'error') {
        return <div className="text-sm text-destructive flex items-center gap-2"><AlertCircle className="h-4 w-4" /><span>{uploadError[fileType]}</span></div>
    }
    return null;
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
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            
            <Card className="lg:col-span-1 flex flex-col">
                 <CardHeader>
                    <CardTitle>1. Upload Inventory File</CardTitle>
                    <CardDescription>Upload the inventory file (e.g., .xlsx). This will be linked to all recipients.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                     {renderFileStatus('inventory')}
                     <div className="space-y-2">
                        <Label htmlFor="inventory-upload">Upload New Inventory</Label>
                        <Input id="inventory-upload" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => handleFileChange(e, 'inventory')} disabled={isUploading('inventory')} />
                     </div>
                    {renderUploadStatus('inventory')}
                </CardContent>
                <CardFooter>
                    <Button onClick={() => handleUpload('inventory')} disabled={!inventoryFile || isUploading('inventory')} className="w-full">
                        {isUploading('inventory') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isUploading('inventory') ? 'Uploading...' : 'Upload Inventory'}
                    </Button>
                </CardFooter>
            </Card>

            <Card className="lg:col-span-1 flex flex-col">
                 <CardHeader>
                    <CardTitle>2. Upload Instructions File</CardTitle>
                    <CardDescription>Upload the instructions file (e.g., .pdf). This will be linked to all recipients.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4 flex-grow">
                     {renderFileStatus('instructions')}
                     <div className="space-y-2">
                        <Label htmlFor="instructions-upload">Upload New Instructions</Label>
                        <Input id="instructions-upload" type="file" accept=".pdf,application/pdf" onChange={(e) => handleFileChange(e, 'instructions')} disabled={isUploading('instructions')} />
                     </div>
                    {renderUploadStatus('instructions')}
                </CardContent>
                <CardFooter>
                    <Button onClick={() => handleUpload('instructions')} disabled={!instructionsFile || isUploading('instructions')} className="w-full">
                        {isUploading('instructions') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                         {isUploading('instructions') ? 'Uploading...' : 'Upload Instructions'}
                    </Button>
                </CardFooter>
            </Card>

             <Card className="lg:col-span-1 flex flex-col">
                 <CardHeader>
                    <CardTitle>3. Upload Proces Verbal File</CardTitle>
                    <CardDescription>Upload the proces verbal file (e.g., .pdf). This will be linked to all recipients.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4 flex-grow">
                    {renderFileStatus('procesVerbal')}
                     <div className="space-y-2">
                        <Label htmlFor="proces-verbal-upload">Upload New Proces Verbal</Label>
                        <Input id="proces-verbal-upload" type="file" accept=".pdf,application/pdf" onChange={(e) => handleFileChange(e, 'procesVerbal')} disabled={isUploading('procesVerbal')} />
                     </div>
                    {renderUploadStatus('procesVerbal')}
                </CardContent>
                <CardFooter>
                    <Button onClick={() => handleUpload('procesVerbal')} disabled={!procesVerbalFile || isUploading('procesVerbal')} className="w-full">
                        {isUploading('procesVerbal') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                         {isUploading('procesVerbal') ? 'Uploading...' : 'Upload Proces Verbal'}
                    </Button>
                </CardFooter>
            </Card>

            <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle>4. Sync Links to Recipients</CardTitle>
                    <CardDescription>
                        Run this action to link any uploaded static files to all existing recipients in the database.
                        This will only sync files that have been successfully uploaded.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                       This process will update all recipient records. If a file is uploaded later, you can run this sync again to add the new link.
                    </p>
                </CardContent>
                 <CardFooter>
                    <Button onClick={handleSyncLinks} disabled={isSyncing} className="w-full">
                        {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileScan className="mr-2 h-4 w-4" />}
                        {isSyncing ? 'Syncing...' : 'Sync Files to All Recipients'}
                    </Button>
                </CardFooter>
            </Card>
        </div>

      </main>
    </div>
  );
}
