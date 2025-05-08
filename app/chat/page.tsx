"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Play, Pause, Headphones } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Message {
  id?: string;
  text: string;
  audioUrl?: string;
  status: "idle" | "converting" | "playing" | "paused" | "error";
  voiceId: string;
  ttsService: string;
  createdAt?: Date;
}

export default function ChatPage() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState("Amazon");
  const [selectedVoice, setSelectedVoice] = useState("Joanna");
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  // Load messages from API on component mount
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch("/api/tts-messages");
        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }
        const data = await response.json();
        setMessages(
          data.messages.map((msg: any) => ({
            id: msg.id,
            text: msg.text,
            audioUrl: msg.audioUrl,
            status: "idle",
            voiceId: msg.voice_id || "Joanna",
            ttsService: msg.tts_service || "Amazon",
            createdAt: new Date(msg.created_at),
          }))
        );
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error",
          description: "Failed to load chat history",
          variant: "destructive",
        });
      }
    };

    fetchMessages();
  }, []);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!text.trim()) return;

    // Create a temporary message
    const tempMessage: Message = {
      text,
      status: "converting",
      voiceId: selectedVoice,
      ttsService: selectedService,
      createdAt: new Date(),
    };

    // Add to messages
    setMessages((prevMessages) => [tempMessage, ...prevMessages]);
    setLoading(true);
    setText("");

    try {
      // Call the conversion API
      const response = await fetch("/api/convert-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          tts_service: selectedService,
          voiceId: selectedVoice,
          originalFilename: `chat_message_${Date.now()}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to convert text to speech");
      }

      const data = await response.json();

      // Save the message to the database
      const msgResponse = await fetch("/api/tts-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          fileId: data.fileId,
          voiceId: selectedVoice,
          ttsService: selectedService,
        }),
      });

      if (!msgResponse.ok) {
        throw new Error("Failed to save message");
      }

      // Refresh messages to get the audio URL
      const refreshResponse = await fetch("/api/tts-messages");
      const refreshData = await refreshResponse.json();

      setMessages(
        refreshData.messages.map((msg: any) => ({
          id: msg.id,
          text: msg.text,
          audioUrl: msg.audioUrl,
          status: "idle",
          voiceId: msg.voice_id || "Joanna",
          ttsService: msg.tts_service || "Amazon",
          createdAt: new Date(msg.created_at),
        }))
      );

      toast({
        title: "Success",
        description: "Message sent and converted to speech",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to convert text to speech",
        variant: "destructive",
      });

      // Update the temporary message to show error
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg === tempMessage ? { ...msg, status: "error" } : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle audio playback
  const playAudio = (message: Message, index: number) => {
    // Stop any currently playing audio
    messages.forEach((msg, i) => {
      if (msg.status === "playing" && i !== index) {
        const audio = audioRefs.current[i];
        if (audio) {
          audio.pause();
          setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            newMessages[i] = { ...newMessages[i], status: "paused" };
            return newMessages;
          });
        }
      }
    });

    // Play the selected audio
    if (message.status === "playing") {
      // If already playing, pause it
      const audio = audioRefs.current[index];
      if (audio) {
        audio.pause();
        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          newMessages[index] = { ...newMessages[index], status: "paused" };
          return newMessages;
        });
      }
    } else {
      // Start playing
      const audio = audioRefs.current[index];
      if (audio) {
        audio
          .play()
          .then(() => {
            setMessages((prevMessages) => {
              const newMessages = [...prevMessages];
              newMessages[index] = { ...newMessages[index], status: "playing" };
              return newMessages;
            });
          })
          .catch((error) => {
            console.error("Error playing audio:", error);
            toast({
              title: "Error",
              description: "Failed to play audio",
              variant: "destructive",
            });
          });
      }
    }
  };

  // Handle audio ended event
  const handleAudioEnded = (index: number) => {
    setMessages((prevMessages) => {
      const newMessages = [...prevMessages];
      newMessages[index] = { ...newMessages[index], status: "idle" };
      return newMessages;
    });
  };

  // AWS Polly voices
  const pollyVoices = [
    { id: "Joanna", name: "Joanna (Female)" },
    { id: "Matthew", name: "Matthew (Male)" },
    { id: "Salli", name: "Salli (Female)" },
    { id: "Justin", name: "Justin (Male)" },
    { id: "Joey", name: "Joey (Male)" },
    { id: "Kendra", name: "Kendra (Female)" },
    { id: "Kimberly", name: "Kimberly (Female)" },
  ];

  // ElevenLabs voices
  const elevenLabsVoices = [
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Female)" },
    { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi (Female)" },
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella (Female)" },
    { id: "VR6AewLTigWG4xSOukaG", name: "Adam (Male)" },
    { id: "pNInz6obpgDQGcFmaJgB", name: "Sam (Male)" },
  ];

  // Handle service change
  const handleServiceChange = (value: string) => {
    setSelectedService(value);
    // Set a default voice for the selected service
    if (value === "Amazon") {
      setSelectedVoice("Joanna");
    } else if (value === "ElevenLabs") {
      setSelectedVoice("21m00Tcm4TlvDq8ikWAM");
    }
  };

  return (
    <div className="container max-w-5xl py-8">
      <h1 className="text-3xl font-bold mb-8">Text-to-Speech Chat</h1>

      <div className="flex flex-col space-y-8">
        {/* Message input */}
        <div className="flex flex-col space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Select
                value={selectedService}
                onValueChange={handleServiceChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select TTS service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Amazon">AWS Polly</SelectItem>
                  <SelectItem value="ElevenLabs">ElevenLabs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select
                value={selectedVoice}
                onValueChange={setSelectedVoice}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  {selectedService === "Amazon"
                    ? pollyVoices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name}
                        </SelectItem>
                      ))
                    : elevenLabsVoices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your text here..."
            className="min-h-[120px]"
          />

          <Button
            onClick={handleSendMessage}
            disabled={loading || !text.trim()}
            className="ml-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Headphones className="mr-2 h-4 w-4" />
                Convert to Speech
              </>
            )}
          </Button>
        </div>

        {/* Message history */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Message History</h2>

          {messages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No messages yet. Start by typing something above.
            </p>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <Card key={message.id || index} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">
                          {message.ttsService === "Amazon"
                            ? "AWS Polly"
                            : "ElevenLabs"}{" "}
                          • Voice: {
                            (message.ttsService === "Amazon" 
                              ? pollyVoices 
                              : elevenLabsVoices
                            ).find(v => v.id === message.voiceId)?.name || message.voiceId
                          }
                        </p>
                        <p className="text-base">{message.text}</p>
                      </div>

                      {message.status === "converting" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          disabled
                        >
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </Button>
                      ) : message.status === "error" ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 px-3"
                        >
                          Error
                        </Button>
                      ) : (
                        <>
                          {message.audioUrl && (
                            <>
                              <audio
                                ref={(el) => {
                                  audioRefs.current[index] = el;
                                }}
                                src={message.audioUrl}
                                onEnded={() => handleAudioEnded(index)}
                                className="hidden"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => playAudio(message, index)}
                              >
                                {message.status === "playing" ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}