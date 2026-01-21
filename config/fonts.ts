import { Fira_Code as FontMono, Noto_Sans_Thai as FontSans } from "next/font/google";

export const fontSans = FontSans({
  subsets: ["latin", "thai"],
  variable: "--font-sans",
});

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
});
