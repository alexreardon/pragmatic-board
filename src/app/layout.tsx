import type { Metadata } from 'next';
import './globals.css';
import { SideNavigation } from './ui/side-navigation';

export const metadata: Metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="grid min-h-screen grid-cols-[300px_1fr] gap-x-4">
          <SideNavigation />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
