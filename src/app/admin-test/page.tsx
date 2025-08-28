
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/header';
import { Loader2, FlaskConical, AlertTriangle, CheckCircle } from 'lucide-react';
import { testAdminConnectionAction } from '@/app/actions/test-actions';

type TestResult = {
    success: boolean;
    message: string;
    error?: string;
} | null;

export default function AdminTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult>(null);
  const { toast } = useToast();

  const handleTestCall = async () => {
    setIsLoading(true);
    setResult(null);
    const testResult = await testAdminConnectionAction();
    setIsLoading(false);

    setResult(testResult);

    if (testResult.success) {
      toast({
        title: 'Connection Successful',
        description: testResult.message,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: testResult.error || testResult.message,
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Test Firebase Admin Connection</h1>
        </div>

        <div className="grid gap-8 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Firebase Admin SDK Test</CardTitle>
              <CardDescription>
                This action attempts to list 1 user from Firebase Authentication using the server-side Admin SDK. This is a reliable way to check if your service account credentials are configured correctly in your environment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleTestCall} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
                {isLoading ? 'Running Test...' : 'Run Connection Test'}
              </Button>
            </CardContent>
          </Card>

          {result && (
            <Card className={result.success ? 'border-green-500' : 'border-destructive'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {result.success ? <CheckCircle className="text-green-500" /> : <AlertTriangle className="text-destructive" />}
                    Test Result: {result.success ? 'Success' : 'Failure'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                 <p className="text-sm font-medium">{result.message}</p>
                 {result.error && (
                    <div className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
                        <p className="font-semibold mb-2">Error Details:</p>
                        <pre className="whitespace-pre-wrap">{result.error}</pre>
                    </div>
                 )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
