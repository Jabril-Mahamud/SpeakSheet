# SheetSpeak

## Overview

SheetSpeak transforms PDFs or typed text into natural-sounding audio by integrating three leading AI-powered TTS providers—AWS Polly, Google Cloud Text-to-Speech, and ElevenLabs. With tiered subscriptions, users can choose the plan that best fits their needs.

---

## Subscription Tiers & Pricing

| Tier        | Price (USD/month) | Minutes Included | TTS Providers                                |
|:------------|:------------------|:-----------------:|:---------------------------------------------|
| **Free**    | $0                | 10 min            | AWS Polly, Google TTS, ElevenLabs             |
| **Basic**   | $9.99             | 60 min            | AWS Polly, Google TTS, ElevenLabs             |
| **Premium** | $29.99            | 300 min           | AWS Polly, Google TTS, ElevenLabs             |

> **Note:** All tiers include the same suite of TTS providers. Unused minutes do *not* roll over.

---

## Features

- **PDF → Audio**: Convert full documents in one click.  
- **Live Text Chat**: Instant synthesis of pasted or typed text.  
- **Voice Customization**: Adjust speed, pitch, and gender.  
- **Secure Storage**: Supabase-backed file uploads and management.  
- **Audio Library** (Premium): Save, organize, and sync your past conversions.

---

## Tech Stack

- **Frontend**: Next.js (App Router), Tailwind CSS, Framer Motion  
- **Backend**: Next.js API Routes, Supabase (Postgres, Storage, Auth), Stripe  
- **TTS Engines**: AWS Polly, Google Cloud Text-to-Speech, ElevenLabs  
- **Analytics & Deployment**: PostHog, Vercel  

---

## Development Approach

1. **Backend-First**: Implement subscription logic, Stripe webhooks, and TTS integrations.  
2. **API Design**: RESTful endpoints for auth, subscriptions, uploads, and conversion jobs.  
3. **Schema**: Users, Subscriptions, Conversion Jobs, and Usage Records.  
4. **Frontend**: Build UI flows for signup, billing, upload/conversion, and library playback.

---

## Installation

1. Clone the repository:  

   ```bash
   git clone https://github.com/your-repo/SheetSpeak.git
