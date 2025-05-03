/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // First - fix the canvas issue you already had
  webpack: (config) => {
    config.resolve.alias.canvas = false
    
    // Properly configure watchOptions
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/.git/**',
        '**/node_modules/**',
        // Specifically ignore WinSAT directory
        '**/WinSAT/**',
        '**/AppData/Local/Temp/WinSAT/**'
      ]
    }
    
    return config
  },
  // Keep your existing experimental settings
  experimental: {
    turbo: {
      // ...your turbo config
    },
  },
}

module.exports = nextConfig