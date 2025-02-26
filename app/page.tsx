import Hero from "@/components/hero"
import { ChevronRight, Upload, Settings, Sparkles, Download, BookOpen, MessageSquare, FileText } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen">
      <Hero />
      
      <section className="relative bg-background py-16 md:py-24">
        <div className="container px-4 mx-auto">
          {/* Main Features Section */}
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
                Two Ways to Create Audio Content
              </h2>
              <p className="text-xl text-muted-foreground">
                Choose the method that works best for your needs
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-24">
              {/* PDF Conversion Card */}
              <div className="flex flex-col rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
                <div className="bg-gradient-to-r from-indigo-500 to-violet-500 p-6">
                  <FileText className="h-12 w-12 text-white mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">PDF to Audio</h3>
                  <p className="text-white/80">
                    Upload PDF files and convert them to natural-sounding speech
                  </p>
                </div>
                <div className="p-6 flex-grow">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <span className="mr-2 mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        <ChevronRight className="h-3 w-3 text-primary" />
                      </span>
                      <span>Upload and manage multiple PDF files</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        <ChevronRight className="h-3 w-3 text-primary" />
                      </span>
                      <span>Built-in audio player with playback controls</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        <ChevronRight className="h-3 w-3 text-primary" />
                      </span>
                      <span>Download and save audio for offline listening</span>
                    </li>
                  </ul>
                  <Link
                    href="/files"
                    className="w-full inline-flex items-center justify-center rounded-md bg-primary/10 hover:bg-primary/20 px-4 py-2 text-sm font-medium text-primary transition-colors"
                  >
                    Manage PDF Files
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Text Chat Card */}
              <div className="flex flex-col rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-6">
                  <MessageSquare className="h-12 w-12 text-white mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Text Chat</h3>
                  <p className="text-white/80">
                    Type text and instantly hear it in your chosen voice
                  </p>
                </div>
                <div className="p-6 flex-grow">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <span className="mr-2 mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        <ChevronRight className="h-3 w-3 text-primary" />
                      </span>
                      <span>Simple chat interface for quick conversions</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        <ChevronRight className="h-3 w-3 text-primary" />
                      </span>
                      <span>Test different voices and settings in real-time</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        <ChevronRight className="h-3 w-3 text-primary" />
                      </span>
                      <span>Perfect for quick phrases and short content</span>
                    </li>
                  </ul>
                  <Link
                    href="/chat"
                    className="w-full inline-flex items-center justify-center rounded-md bg-primary/10 hover:bg-primary/20 px-4 py-2 text-sm font-medium text-primary transition-colors"
                  >
                    Open Text Chat
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* How It Works Section */}
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-4">
                How SpeakSheet Works
              </h2>
              <p className="text-xl text-muted-foreground">
                Convert your content to audio in just a few simple steps
              </p>
            </div>

            <div className="grid gap-8 relative mb-24">
              {/* Connection Line */}
              <div className="hidden md:block absolute left-[50%] top-12 bottom-12 w-0.5 bg-border" />

              {[
                {
                  icon: Upload,
                  title: "Upload Content",
                  description: "Upload a PDF or type text directly in the chat interface"
                },
                {
                  icon: Settings,
                  title: "Choose Your Voice",
                  description: "Select from Amazon Polly, ElevenLabs, or upcoming Google TTS"
                },
                {
                  icon: Sparkles,
                  title: "AI Processing",
                  description: "Our AI analyzes and converts your content with high accuracy"
                },
                {
                  icon: Download,
                  title: "Get Your Audio",
                  description: "Listen instantly or download for later"
                }
              ].map((step, index) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.title}
                    className="relative flex items-center gap-6 rounded-lg border bg-card p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{step.title}</h3>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                    <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border bg-background">
                      <span className="absolute inset-0 flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* TTS Services Section */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center rounded-full border px-6 py-2 text-sm mb-8">
                <Sparkles className="mr-2 h-4 w-4" />
                Multiple Voice Services
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-6">
                Choose Your Perfect Voice
              </h2>
              <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                SpeakSheet integrates with leading text-to-speech providers
              </p>

              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {[
                  {
                    title: "Amazon Polly",
                    description: "High-quality, natural-sounding voices with multiple languages and accents",
                    status: "Active"
                  },
                  {
                    title: "ElevenLabs",
                    description: "Ultra-realistic voices with emotional range and human-like inflection",
                    status: "Active"
                  },
                  {
                    title: "Google Text-to-Speech",
                    description: "Premium voices with natural intonation and multilingual support",
                    status: "Coming Soon"
                  }
                ].map((service) => (
                  <div
                    key={service.title}
                    className="p-6 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold mb-2">{service.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      service.status === "Active" 
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {service.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Future Features Section */}
            <div className="mt-24 text-center">
              <div className="inline-flex items-center rounded-full border px-6 py-2 text-sm mb-8">
                <BookOpen className="mr-2 h-4 w-4" />
                Coming Soon
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-6">
                Your Personal Audiobook Library
              </h2>
              <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                Soon you'll be able to build your own audiobook collection from your PDF documents
              </p>

              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {[
                  {
                    title: "Organize Collections",
                    description: "Create custom libraries and organize your audio content"
                  },
                  {
                    title: "Smart Bookmarking",
                    description: "Save your progress and continue where you left off"
                  },
                  {
                    title: "Cross-device Sync",
                    description: "Access your audiobooks on any device, anytime"
                  }
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="p-6 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-16">
              <Link
                href="/files"
                className="group inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-violet-500 hover:from-indigo-600 hover:via-cyan-600 hover:to-violet-600 px-8 py-3 text-base font-medium text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                Convert PDFs
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/chat"
                className="group inline-flex items-center justify-center rounded-full border px-8 py-3 text-base font-medium shadow-sm transition-colors hover:bg-muted"
              >
                Try Text Chat
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}