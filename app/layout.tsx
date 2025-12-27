import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Singapore Bus MCP Server',
  description: 'MCP server for Singapore bus arrival information using LTA DataMall API',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
