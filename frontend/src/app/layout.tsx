import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  Manrope,
  Plus_Jakarta_Sans,
  Sora,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import {
  ThemeProvider,
  ThemeStyleProvider,
} from "@/components/layouts/theme-provider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Toaster } from "sonner";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
// Selectable body fonts — switched at runtime via [data-font] (see FontSwitcher).
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

const FONT_VARS = [
  geistSans.variable,
  geistMono.variable,
  inter.variable,
  manrope.variable,
  jakarta.variable,
  sora.variable,
  spaceGrotesk.variable,
].join(" ");

// Applies the saved font before paint to avoid a flash of the default.
const FONT_INIT = `try{var f=localStorage.getItem('app-font');if(f&&f!=='neue')document.documentElement.setAttribute('data-font',f);}catch(e){}`;

export const metadata: Metadata = {
  title: "Askly",
  description:
    "Askly — the AI-powered digital campus. Coursework help, grading, and academic support for students and faculty.",
};

// const themes = BASE_THEMES.flatMap((t) => [t, `${t}-dark`]);

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: pre-paint font init */}
        <script dangerouslySetInnerHTML={{ __html: FONT_INIT }} />
      </head>
      <body
        className={`${FONT_VARS} antialiased max-w-screen overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          themes={["light", "dark"]}
          storageKey="app-theme-v2"
          disableTransitionOnChange
        >
          <ThemeStyleProvider>
            <NextIntlClientProvider>
              <div id="root">
                {children}
                <Toaster richColors />
              </div>
            </NextIntlClientProvider>
          </ThemeStyleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
