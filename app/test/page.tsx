"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, FileText, Upload, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function TestPdfConversion() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [characterCount, setCharacterCount] = useState<number | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please select a PDF file');
        setFile(null);
      }
    }
  };
  
  const handleConvert = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }
    
    setResult(null);
    setError(null);
    setLoading(true);
    setCharacterCount(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }
      
      const data = await response.json();
      setResult(data.text);
      setCharacterCount(data.characterCount || data.text.length);
    } catch (error) {
      console.error('Conversion error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container max-w-4xl py-8">
      <Card className="border shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="text-2xl flex items-center gap-2">
            <FileText className="text-primary" />
            PDF to Text Converter Test
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Select PDF File:</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="file" 
                accept=".pdf"
                onChange={handleFileChange}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
              />
              <Button 
                onClick={handleConvert} 
                disabled={!file || loading}
                className="whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Convert PDF
                  </>
                )}
              </Button>
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected file: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {result && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Conversion Result:</h3>
                {characterCount !== null && (
                  <span className="text-sm text-muted-foreground">
                    Character count: {characterCount.toLocaleString()}
                  </span>
                )}
              </div>
              <Textarea 
                value={result} 
                readOnly 
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
          )}
          
          <div className="bg-muted p-4 rounded-md">
            <h3 className="font-semibold mb-2">Debugging Information:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>API Endpoint: <code>/api/convert</code></li>
              <li>Method: POST</li>
              <li>Form Data: file (FormData field)</li>
              <li>Response Format: JSON with <code>text</code> and <code>characterCount</code> fields</li>
              <li>PDF Parsing Library: pdf-parse (from package.json)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}