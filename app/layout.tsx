import { ThemeSwitcher } from "@/components/theme-switcher";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { CSPostHogProvider } from '../utils/providers';
import Header from "@/components/header";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "SpeakSheet",
  description: "The fastest way to create & manage Text to speech audio content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CSPostHogProvider>
            <main className="min-h-screen flex flex-col items-center">
              <div className="flex-1 w-full flex flex-col gap-20 items-center">
                <Header />
                <div className="flex flex-col gap-20 max-w-7xl w-full p-5">
                  {children}
                </div>
                <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
                  <p>
                    Made by{" "}
                    <a
                      href="https://www.linkedin.com/in/jabril-mahamud/"
                      target="_blank"
                      className="font-bold hover:underline"
                      rel="noreferrer"
                    >
                      Jabril 😃
                    </a>
                  </p>
                  <ThemeSwitcher />
                </footer>
              </div>
            </main>
          </CSPostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}