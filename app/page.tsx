import Hero from "@/components/hero"
import { ChevronRight, Upload, Settings, Sparkles, Download, BookOpen } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen">
      <Hero />
      
      <section className="relative bg-background py-16 md:py-24">
        <div className="container px-4 mx-auto">
          {/* Convert PDF Section */}
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
                PDF to Audio Made Simple
              </h2>
              <p className="text-xl text-muted-foreground">
                Transform your documents into engaging audio in minutes
              </p>
            </div>

            <div className="grid gap-8 relative">
              {/* Connection Line */}
              <div className="hidden md:block absolute left-[50%] top-12 bottom-12 w-0.5 bg-border" />

              {[
                {
                  icon: Upload,
                  title: "Upload Your PDF",
                  description: "Drag and drop your PDF files or select them from your device"
                },
                {
                  icon: Settings,
                  title: "Choose Your Voice",
                  description: "Select from Amazon Polly, ElevenLabs, or Google's natural-sounding voices"
                },
                {
                  icon: Sparkles,
                  title: "AI Processing",
                  description: "Our AI analyzes and converts your document with high accuracy"
                },
                {
                  icon: Download,
                  title: "Get Your Audio",
                  description: "Download your audio file in your preferred format"
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

            <div className="flex justify-center mt-12">
              <Link
                href="/dashboard"
                className="group inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-violet-500 hover:from-indigo-600 hover:via-cyan-600 hover:to-violet-600 px-8 py-3 text-base font-medium text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Converting Now
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}