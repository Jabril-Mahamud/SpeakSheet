'use client'

import { useState } from 'react'
import { createClient } from "@/utils/supabase/client"
import { File, RefreshCw, ArrowRight, CheckCircle, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

interface FileData {
  id: string
  file_path: string
  original_name: string
  created_at: string
  conversion_status: string
  audio_file_path: string | null
  voice_id: string | null
  conversion_error: string | null
}

const VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam" }
]

export default function ConversionInterface({ initialFiles }: { initialFiles: FileData[] }) {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const selectedFile = initialFiles.find(f => f.id === selectedFileId)

  const handleConvert = async () => {
    if (!selectedFileId || !selectedVoiceId) {
      setError('Please select both a PDF file and a voice')
      return
    }

    try {
      setConverting(true)
      setError(null)

      // Update status to converting
      const { error: updateError } = await supabase
        .from('user_files')
        .update({ 
          conversion_status: 'converting (0/0 chunks)',
          voice_id: selectedVoiceId,
          conversion_error: null 
        })
        .eq('id', selectedFileId)

      if (updateError) throw updateError

      // Call conversion API
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          fileId: selectedFileId, 
          voiceId: selectedVoiceId 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Conversion failed')
      }

      router.refresh()
    } catch (error) {
      console.error('Conversion error:', error)
      setError(error instanceof Error ? error.message : 'Conversion failed')
      
      // Update status to error
      await supabase
        .from('user_files')
        .update({ 
          conversion_status: 'error',
          conversion_error: error instanceof Error ? error.message : 'Unknown error' 
        })
        .eq('id', selectedFileId)
    } finally {
      setConverting(false)
    }
  }

  // Helper function to get display message from conversion status
  const getStatusDisplay = (status: string) => {
    if (status.startsWith('converting (')) {
      return 'Converting...'
    }
    return status === 'completed' ? 'Conversion completed' : 
           status === 'error' ? 'Conversion failed' : 
           'Converting...'
  }

  // Helper function to get progress from conversion status
  const getProgress = (status: string) => {
    if (status.startsWith('converting (')) {
      const match = status.match(/converting \((\d+)\/(\d+) chunks\)/)
      if (match) {
        const [current, total] = match.slice(1).map(Number)
        return total > 0 ? Math.round((current / total) * 100) : 0
      }
    }
    return null
  }

  if (initialFiles.length === 0) {
    return (
      <div className="text-center p-12 border-2 border-dashed border-accent rounded-lg">
        <p className="text-muted-foreground">No PDF files found</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6">
            {/* Step 1: Select PDF */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">1. Select PDF</h2>
              <Select
                value={selectedFileId || ''}
                onValueChange={setSelectedFileId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a PDF file" />
                </SelectTrigger>
                <SelectContent>
                  {initialFiles.map((file) => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.original_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Select Voice */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">2. Select Voice</h2>
              <Select
                value={selectedVoiceId || ''}
                onValueChange={setSelectedVoiceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a voice" />
                </SelectTrigger>
                <SelectContent>
                  {VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3: Convert */}
            <div className="pt-2">
              <button
                onClick={handleConvert}
                disabled={!selectedFileId || !selectedVoiceId || converting}
                className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {converting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    Convert to Audio
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md">
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Show conversion results */}
      {selectedFile && selectedFile.conversion_status && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                {selectedFile.conversion_status.includes('converting') && (
                  <RefreshCw size={20} className="animate-spin text-primary" />
                )}
                {selectedFile.conversion_status === 'completed' && (
                  <CheckCircle size={20} className="text-green-500" />
                )}
                {selectedFile.conversion_status === 'error' && (
                  <XCircle size={20} className="text-destructive" />
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {selectedFile.original_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getStatusDisplay(selectedFile.conversion_status)}
                  {getProgress(selectedFile.conversion_status) !== null && (
                    <> - {getProgress(selectedFile.conversion_status)}%</>
                  )}
                </p>
                {selectedFile.conversion_error && (
                  <p className="text-sm text-destructive mt-1">
                    {selectedFile.conversion_error}
                  </p>
                )}
              </div>

              {selectedFile.conversion_status === 'completed' && selectedFile.audio_file_path && (
                <audio
                  controls
                  className="h-8"
                  src={`/api/audio/${selectedFile.id}`}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}