import type { Metadata, Viewport } from "next";
import { Albert_Sans, Big_Shoulders } from "next/font/google";
import "./globals.css";

const corps = Albert_Sans({ variable: "--font-corps", subsets: ["latin"], weight: ["400", "500", "600"] });
// Big Shoulders Display est désormais une seule police variable ; l'axe opsz donne la coupe « Display ».
const titre = Big_Shoulders({ variable: "--font-titre", subsets: ["latin"], weight: "variable", axes: ["opsz"] });

export const metadata: Metadata = {
  title: "Bonii",
  description: "Savoir si une tournée rapporte, avant de la signer.",
};

export const viewport: Viewport = { themeColor: "#090c10", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${corps.variable} ${titre.variable}`}>
      <body>{children}</body>
    </html>
  );
}
