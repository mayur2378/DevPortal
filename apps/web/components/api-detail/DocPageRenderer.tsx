import ReactMarkdown from "react-markdown";

export function DocPageRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-a:text-sky-400 prose-code:bg-slate-800 prose-code:rounded prose-code:px-1">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
