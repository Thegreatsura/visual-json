import { DocsNav } from "@/components/docs-nav";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DocsNav>{children}</DocsNav>;
}
