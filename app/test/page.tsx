"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TestPdfConversion() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleConvert = async () => {
    if (!file) return;
    
    setResult(null);
    setError(null);
    
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
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  };
  
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test PDF to Text Conversion</h1>
      
      <div className="mb-4">
        <input type="file" accept=".pdf" onChange={handleFileChange} />
      </div>
      
      <Button onClick={handleConvert} disabled={!file}>
        Convert PDF to Text
      </Button>
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-md">
          <h2 className="font-bold">Error:</h2>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="mt-4">
          <h2 className="font-bold mb-2">Conversion Result:</h2>
          <div className="p-4 bg-gray-100 rounded-md whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}