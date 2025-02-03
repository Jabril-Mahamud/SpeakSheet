"use client"

import { useState, useEffect } from "react"
import { motion, useAnimation } from "framer-motion"
import { useTheme } from "next-themes"
import { Book, FileText, Volume2 as VolumeUp, Sparkles } from "lucide-react"

export default function FlashierHero() {
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const controls = useAnimation()

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentTheme = theme === "system" ? systemTheme : theme
  const isDark = currentTheme === "dark"

  useEffect(() => {
    controls.start({
      backgroundColor: "transparent",
      color: isDark ? "rgb(var(--foreground-rgb))" : "rgb(var(--foreground-rgb))",
      transition: { duration: 0.5 },
    })
  }, [isDark, controls])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  }

  const colorChangeVariants = {
    animate: {
      color: [
        "rgb(var(--primary-rgb))",
        "rgb(var(--secondary-rgb))",
        "rgb(var(--accent-rgb))",
        "rgb(var(--primary-rgb))",
        "rgb(var(--secondary-rgb))",
        "rgb(var(--accent-rgb))",
      ],
      transition: {
        duration: 5,
        repeat: Number.POSITIVE_INFINITY,
        ease: "linear",
      },
    },
  }

  // Define icon color cycling animation variants directly here
  const iconColorChangeVariants = {
    animate: {
      color: [
        "#FF6347", // Tomato
        "#FFD700", // Gold
        "#32CD32", // LimeGreen
        "#1E90FF", // DodgerBlue
        "#FF1493", // DeepPink
      ],
      transition: {
        duration: 5,
        repeat: Number.POSITIVE_INFINITY,
        ease: "linear",
      },
    },
  }

  if (!mounted) return null

  return (
    <motion.section className="w-full max-w-5xl mx-auto px-5">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 text-center"
      >
        {/* Title Section */}
        <motion.div variants={itemVariants}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 text-indigo-600 dark:text-teal-400">
            Unleash the Power of
            <br />
            <motion.span
              variants={colorChangeVariants}
              animate="animate"
              className="inline-flex items-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-500 dark:from-blue-400 dark:to-green-400"
            >
              AI-Powered Voice <Sparkles className="ml-2 h-8 w-8 text-accent" />
            </motion.span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl font-light mb-8 text-gray-800 dark:text-gray-300">
            Transform your books and PDFs into captivating audio experiences
          </p>
        </motion.div>

        {/* Feature Icons */}
        <motion.div variants={itemVariants} className="flex justify-center space-x-8 mb-8">
          <FeatureIcon Icon={Book} text="Lifelike Narration" iconColorChangeVariants={iconColorChangeVariants} />
          <FeatureIcon Icon={FileText} text="Instant Conversion" iconColorChangeVariants={iconColorChangeVariants} />
          <FeatureIcon Icon={VolumeUp} text="Immersive Audio" iconColorChangeVariants={iconColorChangeVariants} />
        </motion.div>

        {/* CTA Button */}
        <motion.div variants={itemVariants} className="flex justify-center">
          <motion.a
            href="#get-started"
            className="group relative inline-flex items-center justify-center px-6 py-3 text-base font-medium overflow-hidden rounded-md transition-all bg-gradient-to-r from-indigo-600 to-teal-500 dark:from-blue-500 dark:to-green-500 text-white hover:bg-gradient-to-r hover:from-indigo-700 hover:to-teal-600 dark:hover:from-blue-600 dark:hover:to-green-600"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span className="relative z-10 transition duration-500">
              Experience the Magic
            </motion.span>
          </motion.a>
        </motion.div>
      </motion.div>
    </motion.section>
  )
}

function FeatureIcon({
  Icon,
  text,
  iconColorChangeVariants,
}: {
  Icon: React.ElementType
  text: string
  iconColorChangeVariants: any
}) {
  return (
    <motion.div
      className="flex flex-col items-center"
      whileHover={{ scale: 1.1, rotate: 15 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="rounded-full p-3 mb-2 bg-primary/20 dark:bg-primary/10 shadow-lg"
        whileHover={{ scale: 1.2 }}
        transition={{ duration: 0.3 }}
        variants={iconColorChangeVariants}
        animate="animate"
      >
        <Icon className="h-6 w-6 text-primary dark:text-accent" />
      </motion.div>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-300">{text}</span>
    </motion.div>
  )
}
