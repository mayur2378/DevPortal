"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface Comment { id: string; body: string; author: { id: string; name: string }; createdAt: Date }
interface Props { apiId: string; initialComments: Comment[]; currentUserId?: string }

export function CommentThread({ apiId, initialComments, currentUserId }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const addComment = trpc.support.addComment.useMutation({ onSuccess: () => { setBody(""); router.refresh(); } });
  const deleteComment = trpc.support.deleteComment.useMutation({ onSuccess: () => router.refresh() });

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold">Discussion ({initialComments.length})</h3>
      {initialComments.length === 0 && <p className="text-slate-500 text-sm">No comments yet. Be the first!</p>}
      {initialComments.map((c) => (
        <div key={c.id} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {c.author.name[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white text-sm font-medium">{c.author.name}</span>
              <span className="text-slate-500 text-xs">{new Date(c.createdAt).toLocaleDateString()}</span>
              {currentUserId === c.author.id && (
                <button type="button" onClick={() => deleteComment.mutate({ id: c.id })}
                  className="text-slate-600 hover:text-red-400 text-xs ml-auto">Delete</button>
              )}
            </div>
            <p className="text-slate-300 text-sm">{c.body}</p>
          </div>
        </div>
      ))}
      {currentUserId && (
        <form onSubmit={(e) => { e.preventDefault(); addComment.mutate({ apiId, body }); }} className="flex gap-2 mt-4">
          <input value={body} onChange={(e) => setBody(e.target.value)} required
            placeholder="Add a comment..."
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500" />
          <button type="submit" disabled={addComment.isPending}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm">
            Post
          </button>
        </form>
      )}
    </div>
  );
}
