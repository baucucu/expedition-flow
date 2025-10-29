
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/header';
import { ArrowLeft, Loader2, Play } from 'lucide-react';
import { startPvSemnatRenameAction } from '@/app/actions/admin-actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function RenameFilesPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleStartProcess = async () => {
    setIsProcessing(true);
    const result = await startPvSemnatRenameAction();
    setIsProcessing(false);

    if (result.success) {
      toast({
        title: "Process Started",
        description: result.message,
      });
      router.push('/');
    } else {
      toast({
        variant: "destructive",
        title: "Failed to Start Process",
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
          <h1 className="text-2xl font-bold tracking-tight">Rename PV Semnat Files</h1>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Start File Migration</CardTitle>
              <CardDescription>
                This action will start a background process to rename all existing "PV Semnat" files in Firebase Storage to a new, standardized format. It will also update the links in the database.
                <br />
                New format: <code className="font-mono bg-muted p-1 rounded">{'<name>_<group>_<id>_<shipmentId>.<ext>'}</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-yellow-100/50 border border-yellow-300 text-yellow-800 rounded-md text-sm">
                <strong>Warning:</strong> This is a one-time operation and should be run with caution. Ensure no other processes are modifying these files. The process may take a long time to complete depending on the number of files.
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setIsConfirmOpen(true)}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {isProcessing ? 'Processing...' : 'Start Renaming Process'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>

       <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently rename files in your storage and update database records.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleStartProcess}>
                Yes, start the process
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
