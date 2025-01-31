/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Your config options here...
    webpack: (config) => {
      config.resolve.alias.canvas = false
      return config
    }
  }
  
  module.exports = nextConfig