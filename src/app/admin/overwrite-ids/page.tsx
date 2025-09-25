
"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/header';
import { ArrowLeft, FileUp, Loader2, ChevronsRight, AlertTriangle } from 'lucide-react';
import * as xlsx from 'xlsx';
import { overwriteRecipientIdsAction } from '@/app/actions/recipient-actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ParsedRow = Record<string, string | number>;

const EXPECTED_COLUMNS = ['current_recipient_id', 'shipment_id', 'new_recipient_id'];

export default function OverwriteIdsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const fileColumns = useMemo(() => {
    if (parsedData.length === 0) return [];
    return Object.keys(parsedData[0]);
  }, [parsedData]);
  
  const hasCorrectColumns = useMemo(() => {
      if (fileColumns.length === 0) return true; // Don't show error before parsing
      return EXPECTED_COLUMNS.every(col => fileColumns.includes(col));
  }, [fileColumns]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFile = event.target.files[0];
      if (selectedFile && (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || selectedFile.type === 'text/csv')) {
        setFile(selectedFile);
        setParsedData([]);
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
        toast({ variant: "destructive", title: "No File Selected" });
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
            });
        } catch (error) {
             toast({ variant: "destructive", title: "File Parsing Error" });
        } finally {
            setIsParsing(false);
        }
    };
    reader.onerror = () => {
        setIsParsing(false);
        toast({ variant: "destructive", title: "File Read Error" });
    }
    reader.readAsBinaryString(file);
  };
  

  const handleOverwriteIds = async () => {
    if (parsedData.length === 0 || !hasCorrectColumns) {
         toast({
            variant: 'destructive',
            title: 'Invalid Data',
            description: `Please parse a file with the correct columns: ${EXPECTED_COLUMNS.join(', ')}.`
        });
        return;
    }
    
    setIsUpdating(true);
    
    // Ensure all data is serializable (convert to plain objects)
    const plainData = JSON.parse(JSON.stringify(parsedData));

    const result = await overwriteRecipientIdsAction({ data: plainData });
    setIsUpdating(false);

    if (result.success) {
         toast({
            title: 'Update Complete',
            description: result.message
        });
        if (result.data?.notFoundCount && result.data.notFoundCount > 0) {
            console.warn("Records not found:", result.data.notFoundDetails);
        }
        router.push('/');
    } else {
        toast({
            variant: 'destructive',
            title: 'Failed to Overwrite IDs',
            description: result.error
        });
    }
  }


  return (
    <div className="min-h-screen w-full bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Overwrite Recipient IDs</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start max-w-6xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>1. Upload File</CardTitle>
                    <CardDescription>Select an Excel (.xlsx) or CSV file with the required columns: <br /> <code className="font-mono bg-muted p-1 rounded">current_recipient_id</code>, <code className="font-mono bg-muted p-1 rounded">shipment_id</code>, <code className="font-mono bg-muted p-1 rounded">new_recipient_id</code>.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="file-upload">Import File</Label>
                        <Input id="file-upload" type="file" accept=".xlsx,.csv" onChange={handleFileChange} />
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

             <Card className={parsedData.length === 0 ? 'bg-muted/50' : ''}>
                <CardHeader>
                    <CardTitle>2. Review and Update</CardTitle>
                    <CardDescription>Review the parsed data and confirm the update action.</CardDescription>
                </CardHeader>
                <CardContent>
                    {parsedData.length > 0 ? (
                        <div className="space-y-4">
                            {!hasCorrectColumns && (
                                <div className="p-4 bg-destructive/10 text-destructive-foreground border border-destructive rounded-md flex items-start gap-4">
                                    <AlertTriangle className="h-5 w-5 mt-1" />
                                    <div>
                                        <h4 className="font-bold">Column Mismatch</h4>
                                        <p className="text-sm">The uploaded file is missing one or more required columns. Please ensure your file contains: {EXPECTED_COLUMNS.join(', ')}</p>
                                    </div>
                                </div>
                            )}
                             <div className="max-h-[300px] overflow-y-auto pr-4 border rounded-md">
                               <Table>
                                 <TableHeader>
                                    <TableRow>
                                        {fileColumns.map(col => <TableHead key={col}>{col}</TableHead>)}
                                    </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                    {parsedData.slice(0, 10).map((row, i) => (
                                        <TableRow key={i}>
                                            {fileColumns.map(col => <TableCell key={col}>{row[col]}</TableCell>)}
                                        </TableRow>
                                    ))}
                                 </TableBody>
                               </Table>
                               {parsedData.length > 10 && <p className="text-sm text-muted-foreground text-center p-2">...and {parsedData.length - 10} more rows.</p>}
                            </div>
                        </div>
                    ) : (
                         <div className="text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg p-8">
                            <p>No data to display.</p>
                            <p>Parse a file to begin.</p>
                        </div>
                    )}
                </CardContent>
                 <CardFooter>
                    <Button onClick={handleOverwriteIds} disabled={isUpdating || parsedData.length === 0 || !hasCorrectColumns} className="w-full" variant="destructive">
                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronsRight className="mr-2 h-4 w-4" />}
                        {isUpdating ? 'Updating...' : `Overwrite ${parsedData.length} Records`}
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </main>
    </div>
  );
}
