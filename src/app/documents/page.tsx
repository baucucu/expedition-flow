
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/header';
import { ArrowLeft, FileSync, Loader2 } from 'lucide-react';
import { updateRecipientDocumentsAction } from '@/app/actions/expedition-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ManageDocumentsPage() {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleUpdateLinks = async () => {
    setIsUpdating(true);
    const result = await updateRecipientDocumentsAction();
    setIsUpdating(false);

    if (result.success) {
      toast({
        title: 'Update Successful',
        description: result.message,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
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
        
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Link Static Files to Recipients</CardTitle>
                    <CardDescription>
                        This action will link the static `inventory.xlsx` and `instructions.pdf` files from Firebase Storage to all existing recipient records in the database.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   <Alert>
                        <AlertTitle>Prerequisites</AlertTitle>
                        <AlertDescription>
                            Before proceeding, please ensure you have manually uploaded the following files to your Firebase Storage bucket:
                            <ul className="list-disc pl-5 mt-2 text-sm font-mono">
                                <li><span className="font-semibold">static/inventory.xlsx</span></li>
                                <li><span className="font-semibold">static/instructions.pdf</span></li>
                            </ul>
                        </AlertDescription>
                    </Alert>

                    <p className="text-sm text-muted-foreground">
                        Clicking the button below will fetch the download URLs for these two files and update every recipient document in your Firestore database. This will mark the 'Parcel Inventory' and 'Instructions' documents as 'Generated' for everyone.
                    </p>

                    <Button onClick={handleUpdateLinks} disabled={isUpdating} className="w-full">
                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSync className="mr-2 h-4 w-4" />}
                        {isUpdating ? 'Updating All Recipients...' : 'Sync Files and Update All Recipients'}
                    </Button>
                </CardContent>
            </Card>
        </div>

      </main>
    </div>
  );
}
