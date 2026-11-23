import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const corps = Plus_Jakarta_Sans({ variable: "--font-corps", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
// Big Shoulders Display est désormais une seule police variable ; l'axe opsz donne la coupe « Display ».
const titre = Big_Shoulders({ variable: "--font-titre", subsets: ["latin"], weight: "variable", axes: ["opsz"] });

export const metadata: Metadata = {
  title: "Bonii",
  description: "Savoir si une tournée rapporte, avant de la signer.",
};

export const viewport: Viewport = { themeColor: "#1d1638", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${corps.variable} ${titre.variable}`}>
      <body>{children}</body>
    </html>
  );
}
