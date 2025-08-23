
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/header';
import { ArrowLeft, FileScan, Loader2, Upload, FileCheck2, AlertCircle } from 'lucide-react';
import { updateRecipientDocumentsAction } from '@/app/actions/expedition-actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';

type UploadableFile = 'inventory' | 'instructions';

export default function ManageDocumentsPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [inventoryFile, setInventoryFile] = useState<File | null>(null);
  const [instructionsFile, setInstructionsFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<UploadableFile, number | null>>({ inventory: null, instructions: null });
  const [uploading, setUploading] = useState<Record<UploadableFile, boolean>>({ inventory: false, instructions: false });
  const [uploadError, setUploadError] = useState<Record<UploadableFile, string | null>>({ inventory: null, instructions: null });

  const router = useRouter();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: UploadableFile) => {
    const file = e.target.files?.[0] ?? null;
    if (fileType === 'inventory') {
      setInventoryFile(file);
      setUploadError(prev => ({...prev, inventory: null}));
    } else {
      setInstructionsFile(file);
       setUploadError(prev => ({...prev, instructions: null}));
    }
  };

  const handleUpload = async (fileType: UploadableFile) => {
    const file = fileType === 'inventory' ? inventoryFile : instructionsFile;
    if (!file) {
      toast({ variant: 'destructive', title: 'No file selected' });
      return;
    }

    const filePath = fileType === 'inventory' ? 'static/inventory.xlsx' : 'static/instructions.pdf';
    const storageRef = ref(storage, filePath);
    
    setUploading(prev => ({...prev, [fileType]: true}));
    setUploadProgress(prev => ({...prev, [fileType]: 0}));
    setUploadError(prev => ({...prev, [fileType]: null}));

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(prev => ({...prev, [fileType]: progress}));
      }, 
      (error) => {
        setUploading(prev => ({...prev, [fileType]: false}));
        setUploadError(prev => ({...prev, [fileType]: `Upload failed: ${error.message}`}));
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
      }, 
      () => {
        setUploading(prev => ({...prev, [fileType]: false}));
        setUploadProgress(prev => ({...prev, [fileType]: 100}));
        toast({ title: 'Upload Successful', description: `${file.name} has been uploaded.`});
      }
    );
  };

  const handleSyncLinks = async () => {
    setIsSyncing(true);
    const result = await updateRecipientDocumentsAction();
    setIsSyncing(false);

    if (result.success) {
      toast({
        title: 'Sync Successful',
        description: result.message,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: result.error,
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Manage Static Documents</h1>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            
            <Card className="lg:col-span-1">
                 <CardHeader>
                    <CardTitle>1. Upload Inventory File</CardTitle>
                    <CardDescription>Upload the `inventory.xlsx` file. This will overwrite any existing version.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="inventory-upload">Inventory File (.xlsx)</Label>
                        <Input id="inventory-upload" type="file" accept=".xlsx" onChange={(e) => handleFileChange(e, 'inventory')} disabled={uploading.inventory} />
                     </div>
                    {uploadProgress.inventory !== null && (
                      <Progress value={uploadProgress.inventory} className="w-full" />
                    )}
                    {uploading.inventory && <p className="text-sm text-muted-foreground animate-pulse">Uploading...</p>}
                    {uploadProgress.inventory === 100 && !uploading.inventory && (
                        <div className="text-sm text-green-600 flex items-center gap-2">
                            <FileCheck2 className="h-4 w-4" />
                            <span>Upload complete.</span>
                        </div>
                    )}
                    {uploadError.inventory && (
                       <div className="text-sm text-destructive flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>{uploadError.inventory}</span>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={() => handleUpload('inventory')} disabled={!inventoryFile || uploading.inventory} className="w-full">
                        {uploading.inventory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {uploading.inventory ? 'Uploading...' : 'Upload Inventory'}
                    </Button>
                </CardFooter>
            </Card>

            <Card className="lg:col-span-1">
                 <CardHeader>
                    <CardTitle>2. Upload Instructions File</CardTitle>
                    <CardDescription>Upload the `instructions.pdf` file. This will overwrite any existing version.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="instructions-upload">Instructions File (.pdf)</Label>
                        <Input id="instructions-upload" type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'instructions')} disabled={uploading.instructions} />
                     </div>
                    {uploadProgress.instructions !== null && (
                      <Progress value={uploadProgress.instructions} className="w-full" />
                    )}
                    {uploading.instructions && <p className="text-sm text-muted-foreground animate-pulse">Uploading...</p>}
                     {uploadProgress.instructions === 100 && !uploading.instructions && (
                        <div className="text-sm text-green-600 flex items-center gap-2">
                            <FileCheck2 className="h-4 w-4" />
                            <span>Upload complete.</span>
                        </div>
                    )}
                    {uploadError.instructions && (
                       <div className="text-sm text-destructive flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>{uploadError.instructions}</span>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={() => handleUpload('instructions')} disabled={!instructionsFile || uploading.instructions} className="w-full">
                        {uploading.instructions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                         {uploading.instructions ? 'Uploading...' : 'Upload Instructions'}
                    </Button>
                </CardFooter>
            </Card>

            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>3. Sync Links to Recipients</CardTitle>
                    <CardDescription>
                        After uploading the files, run this action to link them to all existing recipients in the database.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        This will fetch the download URLs for the two files from Storage and update every recipient document in your Firestore database.
                    </p>
                </CardContent>
                 <CardFooter>
                    <Button onClick={handleSyncLinks} disabled={isSyncing} className="w-full">
                        {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileScan className="mr-2 h-4 w-4" />}
                        {isSyncing ? 'Syncing All Recipients...' : 'Sync Files to All Recipients'}
                    </Button>
                </CardFooter>
            </Card>
        </div>

      </main>
    </div>
  );
}
