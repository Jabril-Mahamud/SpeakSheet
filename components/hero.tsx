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

  const generateRandomColor = () => {
    const letters = "0123456789ABCDEF"
    let color = "#"
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)]
    }
    return color
  }

  // Sparkles icon color change to random colors
  const sparklesVariants = {
    animate: {
      fill: Array.from({ length: 5 }, generateRandomColor),
      transition: {
        duration: 2,
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
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 text-indigo-600 dark:text-teal-400 hover:text-yellow-500 transition-colors duration-300">
            Unleash the Power of
            <br />
            <motion.span
              variants={colorChangeVariants}
              animate="animate"
              className="inline-flex items-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-500 dark:from-blue-400 dark:to-green-400 hover:text-red-500 transition-all duration-300"
            >
              AI-Powered Voice{" "}
              <motion.div
                className="ml-2 h-8 w-8"
                variants={sparklesVariants}
                animate="animate"
              >
                <Sparkles />
              </motion.div>
            </motion.span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl font-light mb-8 text-gray-800 dark:text-gray-300">
            Transform your books and PDFs into captivating audio experiences
          </p>
        </motion.div>

        {/* Feature Icons */}
        <motion.div variants={itemVariants} className="flex justify-center space-x-8 mb-8">
          <FeatureIcon
            Icon={Book}
            text="Lifelike Narration"
            buttonColor="bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            iconColor={isDark ? "text-white" : "text-black"}
          />
          <FeatureIcon
            Icon={FileText}
            text="Instant Conversion"
            buttonColor="bg-green-500 hover:bg-green-600 dark:bg-green-500 dark:hover:bg-green-600"
            iconColor={isDark ? "text-white" : "text-black"}
          />
          <FeatureIcon
            Icon={VolumeUp}
            text="Immersive Audio"
            buttonColor="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-500 dark:hover:bg-yellow-600"
            iconColor={isDark ? "text-white" : "text-black"}
          />
        </motion.div>

        {/* CTA Button */}
        <motion.div variants={itemVariants} className="flex justify-center">
          <motion.a
            href="#get-started"
            className={`group relative inline-flex items-center justify-center px-6 py-3 text-base font-medium overflow-hidden rounded-md transition-all ${
              isDark
                ? "bg-white text-black hover:bg-gray-200"
                : "bg-black text-white hover:bg-gray-800"
            }`}
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
  buttonColor,
  iconColor,
}: {
  Icon: React.ElementType
  text: string
  buttonColor: string
  iconColor: string
}) {
  return (
    <motion.div
      className="flex flex-col items-center"
      whileHover={{ scale: 1.1, rotate: 15 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className={`${buttonColor} text-white rounded-full p-3 mb-2 shadow-lg`}
        whileHover={{ scale: 1.2 }}
        transition={{ duration: 0.3 }}
      >
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </motion.div>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-300">{text}</span>
    </motion.div>
  )
}
