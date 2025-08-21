
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/header';
import { ArrowLeft, FileUp, Loader2, ChevronsRight, Sparkles } from 'lucide-react';
import * as xlsx from 'xlsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mapFieldsAction } from '@/app/actions/expedition-actions';
import type { FieldMapperInput } from '@/ai/flows/field-mapper';

type ParsedRow = Record<string, string | number>;
type ColumnMapping = Record<string, string>;

const APP_FIELDS = [
    { value: 'id', label: 'Recipient ID' },
    { value: 'name', label: 'Recipient Name' },
    { value: 'address', label: 'Recipient Address' },
    { value: 'items', label: 'Items' },
    { value: 'awb', label: 'AWB' },
    { value: 'email', label: 'Email' },
    { value: 'telephone', label: 'Telephone' },
    { value: 'group', label: 'Group' },
    { value: 'county', label: 'County' },
    { value: 'city', label: 'City' },
    { value: 'schoolName', label: 'School Name' },
    { value: 'schoolUniqueName', label: 'School Unique Name' },
    { value: 'shipmentId', label: 'Shipment ID' },
    { value: 'boxType', label: 'Box Type' },
    { value: 'count', label: 'Count' },
];


export default function NewExpeditionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const fileColumns = useMemo(() => {
    if (parsedData.length === 0) return [];
    return Object.keys(parsedData[0]);
  }, [parsedData]);
  
  // Auto-map columns based on header names
  useEffect(() => {
    if (fileColumns.length > 0) {
        const initialMapping: ColumnMapping = {};
        const fieldMap = new Map(APP_FIELDS.map(f => [f.value.toLowerCase(), f.value]));
        APP_FIELDS.forEach(f => fieldMap.set(f.label.toLowerCase(), f.value));

        // Add common variations
        fieldMap.set('id unic', 'id');
        fieldMap.set('nume', 'name');
        fieldMap.set('adresa', 'address');
        fieldMap.set('continut', 'items');
        fieldMap.set('telefon', 'telephone');
        fieldMap.set('grupa', 'group');
        fieldMap.set('judet', 'county');
        fieldMap.set('oras', 'city');
        fieldMap.set('scoala', 'schoolName');
        fieldMap.set('nume unic scoala', 'schoolUniqueName');
        fieldMap.set('id unic expeditie', 'shipmentId');
        fieldMap.set('tip cutie', 'boxType');
        fieldMap.set('count', 'count');
        
        fileColumns.forEach(col => {
            const lowerCol = col.toLowerCase().replace(/_/g, ' ').trim();
            
            if (fieldMap.has(lowerCol)) {
                initialMapping[col] = fieldMap.get(lowerCol)!;
                return;
            }

            const matchedField = APP_FIELDS.find(field => 
                lowerCol.includes(field.label.toLowerCase()) || 
                field.label.toLowerCase().includes(lowerCol) ||
                lowerCol.includes(field.value.toLowerCase())
            );
            if (matchedField) {
                initialMapping[col] = matchedField.value;
            }
        });
        setColumnMapping(initialMapping);
    }
  }, [fileColumns]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFile = event.target.files[0];
      if (selectedFile && (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || selectedFile.type === 'text/csv')) {
        setFile(selectedFile);
        setParsedData([]);
        setColumnMapping({});
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
  
  const handleMappingChange = (fileCol: string, appField: string) => {
    setColumnMapping(prev => ({...prev, [fileCol]: appField}));
  }

  const handleSuggestMapping = async () => {
    setIsSuggesting(true);
    const input: FieldMapperInput = {
        fileColumns: fileColumns,
        appFields: APP_FIELDS,
    };
    const result = await mapFieldsAction(input);
    setIsSuggesting(false);

    if (result.success && result.data) {
        setColumnMapping(result.data);
        toast({
            title: "AI Suggestions Applied",
            description: "The AI has suggested column mappings."
        })
    } else {
        toast({
            variant: "destructive",
            title: "AI Suggestion Failed",
            description: result.error || "Could not get suggestions from the AI."
        })
    }
  }

  const handleCreateExpedition = () => {
    // Basic validation to ensure required fields are mapped.
    const mappedValues = Object.values(columnMapping);
    if (!mappedValues.includes('name') || !mappedValues.includes('address')) {
        toast({
            variant: 'destructive',
            title: 'Mapping Incomplete',
            description: 'Please map at least "Recipient Name" and "Recipient Address".'
        });
        return;
    }
    setIsCreating(true);
    // In a real app, this would send the parsedData and columnMapping to the server.
    console.log("Creating expedition with:", {
        data: parsedData,
        mapping: columnMapping
    });

    setTimeout(() => {
        toast({
            title: 'Expedition Created',
            description: 'The new expedition has been successfully created from the imported file.'
        });
        setIsCreating(false);
        router.push('/');
    }, 1500)
  }


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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <Card>
                <CardHeader>
                    <CardTitle>1. Upload File</CardTitle>
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

             <Card className={parsedData.length === 0 ? 'bg-muted/50' : ''}>
                <CardHeader>
                    <CardTitle>2. Map Columns</CardTitle>
                    <CardDescription>Match columns from your file to the required application fields.</CardDescription>
                </CardHeader>
                <CardContent>
                    {parsedData.length > 0 ? (
                        <div className="space-y-4">
                             <Button onClick={handleSuggestMapping} disabled={isSuggesting} variant="outline" size="sm">
                                {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Suggest with AI
                            </Button>
                            <div className="space-y-2">
                               {fileColumns.map(col => (
                                <div key={col} className="grid grid-cols-2 gap-4 items-center">
                                    <Label className="text-right truncate">{col}</Label>
                                    <Select 
                                        value={columnMapping[col] || ''}
                                        onValueChange={(value) => handleMappingChange(col, value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select target field..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ignore" className="italic text-muted-foreground">Ignore this column</SelectItem>
                                            {APP_FIELDS.map(field => (
                                                <SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                               ))}
                            </div>
                            <Button onClick={handleCreateExpedition} disabled={isCreating} className="w-full">
                                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronsRight className="mr-2 h-4 w-4" />}
                                Create Expedition from {parsedData.length} Records
                            </Button>
                        </div>
                    ) : (
                         <div className="text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg p-8">
                            <p>No data to map.</p>
                            <p>Parse a file to begin mapping.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
