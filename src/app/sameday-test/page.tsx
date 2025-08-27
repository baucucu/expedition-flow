
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/header';
import { Loader2, TestTube2 } from 'lucide-react';
import { testSamedayAwbAction } from '@/app/actions/awb-actions';

export default function SamedayTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any | null>(null);
  const { toast } = useToast();

  const handleTestCall = async () => {
    setIsLoading(true);
    setResponse(null);
    const result = await testSamedayAwbAction();
    setIsLoading(false);

    if (result.success) {
      toast({
        title: 'API Call Successful',
        description: 'Sameday API returned a successful response.',
      });
      setResponse(result.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'API Call Failed',
        description: result.error,
      });
      setResponse({ error: result.error });
    }
  };

  return (
    <div className="min-h-screen w-full bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Test Sameday AWB Generation</h1>
        </div>

        <div className="grid gap-8 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Sameday API Test</CardTitle>
              <CardDescription>
                Click the button below to send a test request to the Sameday AWB API using static data. The response will be displayed below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleTestCall} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
                {isLoading ? 'Calling API...' : 'Run Sameday API Test'}
              </Button>
            </CardContent>
          </Card>

          {response && (
            <Card>
              <CardHeader>
                <CardTitle>API Response</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
