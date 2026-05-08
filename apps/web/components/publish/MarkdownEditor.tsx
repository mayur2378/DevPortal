"use client";
import dynamic from "next/dynamic";
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });
interface Props { value: string; onChange: (val: string) => void }
export function MarkdownEditor({ value, onChange }: Props) {
  return (
    <div data-color-mode="dark">
      <MDEditor value={value} onChange={(v) => onChange(v ?? "")} height={300} />
    </div>
  );
}
