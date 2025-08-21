
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/header';
import { ArrowLeft, FileUp, Loader2 } from 'lucide-react';
import * as xlsx from 'xlsx';

type ParsedRow = Record<string, string | number>;

export default function NewExpeditionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFile = event.target.files[0];
      if (selectedFile && (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || selectedFile.type === 'text/csv')) {
        setFile(selectedFile);
      } else {
        toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: "Please upload a valid Excel (.xlsx) or CSV file.",
        });
      }
    }
  };

  const handleParseFile = async () => {
    if (!file) {
        toast({
            variant: "destructive",
            title: "No File Selected",
            description: "Please select a file to import.",
        });
        return;
    }

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = e.target?.result;
            const workbook = xlsx.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = xlsx.utils.sheet_to_json(worksheet) as ParsedRow[];
            setParsedData(jsonData);
            toast({
                title: "File Parsed Successfully",
                description: `Found ${jsonData.length} records in the file.`
            })
        } catch (error) {
             toast({
                variant: "destructive",
                title: "File Parsing Error",
                description: "There was an error parsing the file. Please check the file format.",
            });
        } finally {
            setIsParsing(false);
        }
    };
    reader.onerror = () => {
        setIsParsing(false);
        toast({
            variant: "destructive",
            title: "File Read Error",
            description: "Could not read the selected file.",
        });
    }
    reader.readAsBinaryString(file);
  };


  return (
    <div className="min-h-screen w-full bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Import New Expedition</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Upload File</CardTitle>
                    <CardDescription>Select an Excel (.xlsx) or CSV file to import recipients from.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="file-upload">Import File</Label>
                        <div className="flex items-center gap-2">
                             <Input id="file-upload" type="file" accept=".xlsx,.csv" onChange={handleFileChange} />
                        </div>
                       
                    </div>
                     <Button onClick={handleParseFile} disabled={isParsing || !file}>
                        {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                        {isParsing ? 'Parsing...' : 'Parse File'}
                    </Button>
                     {file && (
                        <p className="text-sm text-muted-foreground">Selected file: {file.name}</p>
                    )}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Import Preview</CardTitle>
                    <CardDescription>A preview of the data to be imported will appear here after parsing.</CardDescription>
                </CardHeader>
                <CardContent>
                    {parsedData.length > 0 ? (
                        <div className="text-sm text-muted-foreground">
                            <p>Successfully parsed {parsedData.length} rows. The next step would be to map columns and create the expedition.</p>
                            {/* In a real app, you'd show a preview table and have column mapping UI here */}
                        </div>
                    ) : (
                         <div className="text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg p-8">
                            <p>No data to preview.</p>
                            <p>Parse a file to see the results.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
      </main>
    </div>
  );
}
