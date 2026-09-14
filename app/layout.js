import "./globals.css";

export const metadata = {
  title: "Content Pipeline Agent",
  description: "AI-assisted research → script → voice → video → publish pipeline",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
