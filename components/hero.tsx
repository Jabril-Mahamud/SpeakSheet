'use client'

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { ArrowRight, FileText, MessageSquare, Volume2, Sparkles } from "lucide-react"
import Particles from "react-tsparticles"
import { loadSlim } from "tsparticles-slim"
import type { Engine } from "tsparticles-engine"
import Link from "next/link"

const features = [
  { 
    name: "PDF to Audio", 
    icon: FileText, 
    description: "Convert PDFs into natural speech", 
    link: "/files"
  },
  { 
    name: "Simple Text Conversion", 
    icon: MessageSquare, 
    description: "Type text and hear it instantly", 
    link: "/chat"
  },
  { 
    name: "Multiple Voice Options", 
    icon: Volume2, 
    description: "Amazon Polly, ElevenLabs & more", 
    link: "/files"
  }
]

export default function Hero() {
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine)
  }, [])

  if (!mounted) return null

  const currentTheme = theme === "system" ? systemTheme : theme
  const isDark = currentTheme === "dark"

  return (
    <section className="relative overflow-hidden pb-[140px]">
      {/* Particles Background */}
      <Particles
        className="absolute inset-0 -z-10"
        id="tsparticles"
        init={particlesInit}
        options={{
          particles: {
            color: {
              value: ["#6366f1", "#06b6d4", "#8b5cf6"]
            },
            number: { value: 50, density: { enable: true, value_area: 800 } },
            shape: { type: "circle" },
            opacity: { value: 0.2 },
            size: { value: { min: 1, max: 3 } },
            links: {
              enable: true,
              distance: 150,
              color: isDark ? "#a78bfa" : "#6366f1",
              opacity: 0.1,
              width: 1
            },
            move: {
              enable: true,
              speed: 1,
              direction: "none",
              random: true,
              straight: false,
              outModes: { default: "bounce" }
            }
          },
          interactivity: {
            events: {
              onHover: { enable: true, mode: "grab" },
              onClick: { enable: true, mode: "push" }
            },
            modes: {
              grab: { distance: 140, links: { opacity: 0.2 } },
              push: { quantity: 4 }
            }
          }
        }}
      />

      <div className="container px-4 mx-auto">
        {/* Hero Content */}
        <div className="relative pt-20 pb-16 md:pt-32 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8 inline-flex items-center rounded-full border px-6 py-2 text-sm backdrop-blur-sm"
            >
              <motion.div
                animate={{
                  color: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FDCB6E", "#6C5CE7"],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: 'loop',
                  ease: 'easeInOut'
                }}
              >
                <Sparkles className="mr-2 h-4 w-4" />
              </motion.div>
              Text to Speech Made Simple
            </motion.div>

            <motion.h1 
              className="text-4xl font-bold tracking-tighter sm:text-6xl md:text-7xl mb-8"
            >
              <motion.span
                animate={{
                  color: ["#4F46E5", "#06b6d4", "#7C3AED", "#4F46E5"],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                SheetSpeak
              </motion.span>
              <br />
              <span className="text-foreground">Words to Voice</span>
            </motion.h1>

            <p className="max-w-2xl mx-auto text-xl text-muted-foreground mb-12">
              Convert PDFs to audio or type text for instant speech.
              Multiple voice services, one seamless platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href="/files"
                className="group inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-violet-500 hover:from-indigo-600 hover:via-cyan-600 hover:to-violet-600 px-8 text-base font-medium text-white shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                Convert PDF to Audio
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href="/chat"
                className="inline-flex h-12 items-center justify-center rounded-full border px-8 text-base font-medium shadow-sm transition-colors hover:bg-muted"
              >
                Try Text Chat
              </motion.a>
            </div>
          </motion.div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="group relative overflow-hidden rounded-2xl border bg-background/50 p-6 backdrop-blur-sm hover:shadow-lg transition-shadow"
                >
                  <Link href={feature.link} className="absolute inset-0 z-10">
                    <span className="sr-only">Go to {feature.name}</span>
                  </Link>
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{feature.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0 h-[100px]">
        <svg
          className="absolute bottom-0 w-full h-full"
          viewBox="0 0 1440 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 40C840 33 960 27 1080 33.3C1200 40 1320 60 1380 70L1440 80V100H1380C1320 100 1200 100 1080 100C960 100 840 100 720 100C600 100 480 100 360 100C240 100 120 100 60 100H0V0Z"
            className="fill-background"
          />
        </svg>
      </div>
    </section>
  )
}