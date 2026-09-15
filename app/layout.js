import "./globals.css";
import SiteNav from "../components/SiteNav";

export const metadata = {
  title: "Content Pipeline",
  description: "Type a subject; get finished long-form videos.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
