"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Headphones,
  Send,
  Pause,
  Play,
  Trash2,
  AlertTriangle,
  Volume2,
  Loader2,
  Info,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Message } from "@/utils/types";

export default function EnhancedTTSChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [hasRateLimitError, setHasRateLimitError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedService, setSelectedService] = useState("Amazon");
  const [selectedVoice, setSelectedVoice] = useState("Joanna");
  
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Fetch previous messages on component mount
  useEffect(() => {
    fetchPreviousMessages();
  }, []);
  
  // Handle voice selection when service changes
  useEffect(() => {
    // Set default voice when service changes
    if (selectedService === "Amazon") {
      setSelectedVoice("Joanna");
    } else {
      setSelectedVoice("21m00Tcm4TlvDq8ikWAM"); // Rachel voice for ElevenLabs
    }
  }, [selectedService]);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Stop all playing audio when component unmounts
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) {
          audio.pause();
        }
      });
    };
  }, []);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  const fetchPreviousMessages = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Fetch previous messages
      const response = await fetch("/api/tts-messages?limit=20");
      if (response.ok) {
        const data = await response.json();

        // Convert the fetched messages to our local format
        const formattedMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          text: msg.text,
          timestamp: new Date(msg.created_at),
          audioUrl: msg.audioUrl,
          status: "idle",
          duration: undefined,
          currentTime: 0,
          voice_id: msg.voice_id, // Store the voice ID from the database
          tts_service: msg.tts_service, // Store the TTS service from the database
        }));

        setMessages(formattedMessages);

        // Pre-create Audio objects for each message with audio
        formattedMessages.forEach((msg: Message) => {
          if (msg.audioUrl) {
            const audio = new Audio(msg.audioUrl);
            audioRefs.current[msg.id] = audio;

            // Set up audio metadata handling
            audio.addEventListener("loadedmetadata", () => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msg.id ? { ...m, duration: audio.duration } : m
                )
              );
            });

            // Set up time update handling
            audio.addEventListener("timeupdate", () => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msg.id
                    ? { ...m, currentTime: audio.currentTime }
                    : m
                )
              );
            });
          }
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load your messages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!inputText.trim() || isProcessing) {
      return;
    }

    // Check if user has hit rate limit before
    if (hasRateLimitError) {
      setShowLimitDialog(true);
      return;
    }

    const messageId = crypto.randomUUID();
    const newMessage: Message = {
      id: messageId,
      text: inputText.trim(),
      timestamp: new Date(),
      status: "converting",
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");
    setIsProcessing(true);

    try {
      // Determine which endpoint to use based on selected service
      const endpoint = selectedService === "ElevenLabs" 
        ? "/api/convert-audio/elevenlabs" 
        : "/api/convert-audio/polly";

      const requestBody = {
        text: newMessage.text,
        voiceId: selectedVoice,
        originalFilename: `chat_message_${messageId}`,
        ...(selectedService === "ElevenLabs" && {
          stability: 0.5,
          similarityBoost: 0.75,
        }),
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle specific error cases
        if (response.status === 401) {
          throw new Error("Authentication required. Please check your API key.");
        } else if (response.status === 429) {
          setHasRateLimitError(true);
          throw new Error("Usage limit exceeded. Please try again later.");
        }

        throw new Error(errorData.error || "Conversion failed");
      }

      const data = await response.json();

      // Get the file ID from the response
      const fileId = data.fileId;

      if (!fileId) {
        throw new Error("No file ID returned from conversion");
      }

      // Fetch the file record to get the correct path
      const { data: fileRecord, error: fileError } = await supabase
        .from("files")
        .select("file_path")
        .eq("id", fileId)
        .single();

      if (fileError || !fileRecord) {
        throw new Error("Failed to retrieve file information");
      }

      // Now create a signed URL using the correct file path
      const { data: fileData } = await supabase.storage
        .from("files")
        .createSignedUrl(fileRecord.file_path, 3600);

      if (!fileData?.signedUrl) {
        throw new Error("Failed to get audio URL");
      }

      // Update the message with audio URL
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                audioUrl: fileData.signedUrl,
                status: "idle",
                voice_id: selectedVoice,
                tts_service: selectedService,
              }
            : msg
        )
      );

      // Save the message to the database
      try {
        await fetch("/api/tts-messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileId: fileId,
            text: newMessage.text,
            voiceId: selectedVoice,
            ttsService: selectedService,
          }),
        });
      } catch (error) {
        console.error("Error saving message to database:", error);
        // Non-critical error, so we don't need to show to the user
      }

      // Create an audio element reference
      const audio = new Audio(fileData.signedUrl);
      audioRefs.current[messageId] = audio;

      // Set up audio metadata handling
      audio.addEventListener("loadedmetadata", () => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, duration: audio.duration } : msg
          )
        );
      });

      // Set up time update handling
      audio.addEventListener("timeupdate", () => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, currentTime: audio.currentTime }
              : msg
          )
        );
      });

      // Auto-play the newly created audio
      playAudio(messageId);
    } catch (error) {
      console.error("Conversion error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to convert to audio";

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, status: "error", error: errorMessage }
            : msg
        )
      );

      if (errorMessage.includes("Usage limit exceeded")) {
        setShowLimitDialog(true);
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = (messageId: string) => {
    // Pause any currently playing audio
    Object.entries(audioRefs.current).forEach(([id, audio]) => {
      if (audio && id !== messageId) {
        audio.pause();

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === id && msg.status === "playing"
              ? { ...msg, status: "paused" }
              : msg
          )
        );
      }
    });

    const audio = audioRefs.current[messageId];
    if (!audio) return;

    // Set up event listeners
    audio.onplay = () => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: "playing" } : msg
        )
      );
    };

    audio.onpause = () => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: "paused" } : msg
        )
      );
    };

    audio.onended = () => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, status: "idle", currentTime: 0 }
            : msg
        )
      );
    };

    // Play the audio
    audio.play().catch((error) => {
      console.error("Error playing audio:", error);
      toast({
        title: "Error",
        description: "Failed to play audio",
        variant: "destructive",
      });
    });
  };

  const pauseAudio = (messageId: string) => {
    const audio = audioRefs.current[messageId];
    if (audio) {
      audio.pause();
    }
  };

  const deleteMessage = async (messageId: string) => {
    // Stop audio if playing
    const audio = audioRefs.current[messageId];
    if (audio) {
      audio.pause();
      delete audioRefs.current[messageId];
    }

    // Remove message from UI immediately (optimistic update)
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

    // Delete from database
    try {
      const response = await fetch(`/api/tts-messages?id=${messageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete message");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  // Voice color mapping function
  const getVoiceColor = (voiceName?: string): string => {
    if (!voiceName) return "bg-accent/30 text-muted-foreground"; // Default

    // Color mapping based on voice name
    const colorMap: Record<string, string> = {
      // Amazon Polly voices
      Joanna: "bg-blue-100 text-blue-700",
      Matthew: "bg-green-100 text-green-700",
      Salli: "bg-purple-100 text-purple-700",
      Justin: "bg-amber-100 text-amber-700",
      Joey: "bg-red-100 text-red-700",
      Kendra: "bg-pink-100 text-pink-700",
      Kimberly: "bg-indigo-100 text-indigo-700",
      Kevin: "bg-cyan-100 text-cyan-700",

      // ElevenLabs voice IDs
      "21m00Tcm4TlvDq8ikWAM": "bg-teal-100 text-teal-700", // Rachel
      "AZnzlk1XvdvUeBnXmlld": "bg-orange-100 text-orange-700", // Domi
      "EXAVITQu4vr4xnSDxMaL": "bg-rose-100 text-rose-700", // Bella
      "VR6AewLTigWG4xnSOukaG": "bg-emerald-100 text-emerald-700", // Adam
      "pNInz6obpgDQGcFmaJgB": "bg-blue-100 text-blue-700", // Sam
    };

    // Try to match by name
    for (const [name, color] of Object.entries(colorMap)) {
      if (voiceName.includes(name)) {
        return color;
      }
    }

    // If no match, get a stable color based on voice name
    const hash = voiceName.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    const hue = Math.abs(hash) % 360;
    return `bg-opacity-20 bg-[hsl(${hue},70%,60%)] text-[hsl(${hue},70%,40%)]`;
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const calculateProgress = (
    currentTime?: number,
    duration?: number
  ): number => {
    if (!currentTime || !duration) return 0;
    return (currentTime / duration) * 100;
  };

  // Get the display name for a voice
  const getVoiceDisplayName = (id: string): string => {
    const voiceMap: Record<string, string> = {
      // Amazon Polly voices
      "Joanna": "Joanna (Female)",
      "Matthew": "Matthew (Male)",
      "Salli": "Salli (Female)",
      "Justin": "Justin (Male)",
      "Joey": "Joey (Male)",
      "Kendra": "Kendra (Female)",
      "Kimberly": "Kimberly (Female)",
      "Kevin": "Kevin (Male)",
      
      // ElevenLabs voices
      "21m00Tcm4TlvDq8ikWAM": "Rachel (Female)",
      "AZnzlk1XvdvUeBnXmlld": "Domi (Female)",
      "EXAVITQu4vr4xnSDxMaL": "Bella (Female)",
      "VR6AewLTigWG4xnSOukaG": "Adam (Male)",
      "pNInz6obpgDQGcFmaJgB": "Sam (Male)",
    };
    
    return voiceMap[id] || id;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4 mx-auto" />
          <p className="text-lg font-medium">Loading your messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full py-6">
      <Card className="shadow-lg border-2 w-full">
        <CardHeader className="border-b bg-card/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Speech Chat</CardTitle>
            </div>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowHelpDialog(true)}
                      className="rounded-full bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800"
                    >
                      <Info className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>How to use this tool</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex flex-col h-[70vh]">
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-center bg-accent/30 p-8 rounded-xl max-w-md">
                    <Volume2 className="mx-auto h-16 w-16 mb-4 text-primary/60" />
                    <h3 className="text-xl font-semibold mb-2">
                      Welcome to Speech Chat
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Type a message below and hear it spoken aloud!
                    </p>
                    <Button
                      variant="outline"
                      className="mx-auto"
                      onClick={() => setShowHelpDialog(true)}
                    >
                      <Info className="mr-2 h-4 w-4" />
                      How to use this tool
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((message) => (
                    <Card key={message.id} className="overflow-hidden">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-base flex-1">{message.text}</p>
                          <div
                            className={`text-sm px-2 py-1 rounded-md ml-3 shrink-0 ${getVoiceColor(
                              message.voice_id
                            )}`}
                          >
                            {message.voice_id ? getVoiceDisplayName(message.voice_id) : "Default Voice"}
                          </div>
                        </div>

                        {message.status === "converting" ? (
                          <div className="flex items-center gap-3 p-3 bg-accent/40 rounded-lg">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="font-medium">
                              Converting to speech...
                            </span>
                          </div>
                        ) : message.status === "error" ? (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{message.error}</AlertDescription>
                          </Alert>
                        ) : (
                          message.audioUrl && (
                            <div className="rounded-lg border bg-card p-3">
                              <div className="flex items-center gap-3 mb-2">
                                <Button
                                  variant={
                                    message.status === "playing"
                                      ? "default"
                                      : "outline"
                                  }
                                  className={`h-10 w-10 rounded-full p-0 ${message.status === "playing" ? "bg-primary" : ""}`}
                                  onClick={() =>
                                    message.status === "playing"
                                      ? pauseAudio(message.id)
                                      : playAudio(message.id)
                                  }
                                >
                                  {message.status === "playing" ? (
                                    <Pause className="h-5 w-5" />
                                  ) : (
                                    <Play className="h-5 w-5" />
                                  )}
                                </Button>

                                <div className="flex-1">
                                  <Progress
                                    value={calculateProgress(
                                      message.currentTime,
                                      message.duration
                                    )}
                                    className={`h-3 ${message.status === "playing" ? "bg-primary/20" : "bg-accent/40"}`}
                                  />
                                </div>

                                <div className="text-sm font-mono">
                                  {message.currentTime !== undefined &&
                                  message.duration !== undefined
                                    ? `${formatTime(message.currentTime)} / ${formatTime(message.duration)}`
                                    : "0:00"}
                                </div>
                              </div>

                              <div className="flex justify-between items-center">
                                <div className="text-xs text-muted-foreground">
                                  {message.timestamp.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                </div>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        className="h-8 w-8 rounded-full p-0"
                                        onClick={() =>
                                          deleteMessage(message.id)
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Delete message
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </Card>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <form
              onSubmit={handleSubmit}
              className="p-4 border-t"
              aria-label="Message input form"
            >
              <div className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <Select
                    value={selectedService}
                    onValueChange={setSelectedService}
                    disabled={isProcessing}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Amazon">AWS Polly</SelectItem>
                      <SelectItem value="ElevenLabs">ElevenLabs</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={selectedVoice}
                    onValueChange={setSelectedVoice}
                    disabled={isProcessing}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedService === "Amazon" ? (
                        <>
                          <SelectItem value="Joanna">Joanna (Female)</SelectItem>
                          <SelectItem value="Matthew">Matthew (Male)</SelectItem>
                          <SelectItem value="Salli">Salli (Female)</SelectItem>
                          <SelectItem value="Justin">Justin (Male)</SelectItem>
                          <SelectItem value="Joey">Joey (Male)</SelectItem>
                          <SelectItem value="Kendra">Kendra (Female)</SelectItem>
                          <SelectItem value="Kimberly">Kimberly (Female)</SelectItem>
                          <SelectItem value="Kevin">Kevin (Male)</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="21m00Tcm4TlvDq8ikWAM">Rachel (Female)</SelectItem>
                          <SelectItem value="AZnzlk1XvdvUeBnXmlld">Domi (Female)</SelectItem>
                          <SelectItem value="EXAVITQu4vr4xnSDxMaL">Bella (Female)</SelectItem>
                          <SelectItem value="VR6AewLTigWG4xnSOukaG">Adam (Male)</SelectItem>
                          <SelectItem value="pNInz6obpgDQGcFmaJgB">Sam (Male)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-3">
                  <Textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your message here..."
                    className="resize-none min-h-[60px] text-base p-3"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    aria-label="Message text"
                  />
                  <Button
                    type="submit"
                    className="h-auto px-6 rounded-full bg-primary hover:bg-primary/90"
                    disabled={!inputText.trim() || isProcessing}
                    aria-label="Convert to speech"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Converting...
                      </>
                    ) : (
                      <>
                        <Headphones className="h-5 w-5 mr-2" />
                        Speak
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {hasRateLimitError && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Usage limit exceeded</AlertTitle>
                  <AlertDescription>
                    You've reached your monthly speech limit.
                    <Button
                      variant="link"
                      className="h-auto p-0 text-destructive-foreground underline ml-1"
                      onClick={() => setShowLimitDialog(true)}
                    >
                      Learn more
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Usage limit dialog */}
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Usage Limit Reached
            </DialogTitle>
            <DialogDescription className="text-base">
              You have used all your monthly speech characters.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription className="text-base">
                To continue converting text to speech, please try again later.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLimitDialog(false)}
              className="sm:flex-1"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              How to Use Speech Chat
            </DialogTitle>
            <DialogDescription className="text-base">
              A simple guide to convert your text to spoken words
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 my-2">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  1
                </div>
                Select a voice service
              </h3>
              <p className="text-muted-foreground ml-8">
                Choose between AWS Polly and ElevenLabs for different voice options.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  2
                </div>
                Select a voice
              </h3>
              <p className="text-muted-foreground ml-8">
                Choose from a variety of male and female voices.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  3
                </div>
                Type your message
              </h3>
              <p className="text-muted-foreground ml-8">
                Enter the text you want to hear in the message box.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  4
                </div>
                Click "Speak"
              </h3>
              <p className="text-muted-foreground ml-8">
                Your message will be converted and begin playing automatically.
                Use the play/pause button to control playback.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowHelpDialog(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}