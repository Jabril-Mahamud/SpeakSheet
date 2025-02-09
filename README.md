# AlexandrAI

## Overview
AlexandrAI is a **PDF to Audio Converter** that transforms PDFs into high-quality speech using AI-driven text-to-speech (TTS) services. Users can upload files, select from multiple voice options, and generate natural-sounding audio files. Future updates will include audiobook organization and cross-device syncing.

## Features
- **PDF to Audio Conversion**: Upload a PDF and convert it to speech.
- **Multiple TTS Services**: Currently supports Amazon Polly, with planned integration for ElevenLabs (priority) and Google TTS.
- **File Upload with Supabase**: Securely upload and process files using Supabase.
- **Future Audiobook Library**: Organize and store converted audio for easy access.

## Tech Stack
- **Next.js** (App Router)
- **Tailwind CSS** (UI Styling)
- **Framer Motion** (Animations)
- **Lucide-react** (Icons)
- **tsparticles** (Background Particles)
- **AWS Polly (Live), ElevenLabs (in progress), Google TTS (Planned)** (Text-to-Speech APIs)
- **Supabase** (backend)
- **Vercel** (deployment)
- **PostHog** (Analytics)

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/AlexandrAI.git
   ```
2. Navigate to the project folder:
   ```bash
   cd AlexandrAI
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage
1. Upload a PDF.
2. Select a voice and convert the text to speech.
3. Download the generated audio file.

## Roadmap
- [ ] **AWS Polly Usage Tracking**: Implement monitoring to prevent excessive API costs.
- [ ] **ElevenLabs Integration**: Add support for ElevenLabs TTS as a priority.
- [ ] **Google TTS Integration**: Implement Google TTS as an additional voice option.
- [ ] **Audiobook Library Management**: Enable organization and storage of converted audio.
- [ ] **Cross-Device Syncing**: Ensure seamless playback across multiple devices.
- [ ] **Mobile Usability Optimization**: Improve UI/UX for mobile users.

## TODO
- Configure **AWS Polly tracking** to monitor API usage.

## License
This project is licensed under the MIT License.

## Contributing
Contributions are welcome! Feel free to submit a pull request or suggest features via issues.

