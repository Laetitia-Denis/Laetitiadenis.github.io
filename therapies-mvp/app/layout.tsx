import "./globals.css";

export const metadata = {
  title: "Assistants Bien-être — MVP",
  description: "Assistants IA d'accompagnement pour praticiens de thérapies alternatives.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
