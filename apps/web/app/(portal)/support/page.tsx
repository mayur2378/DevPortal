import { createCaller } from "@/lib/trpc/server";
import { SupportTicketForm } from "@/components/support/SupportTicketForm";
import { FaqSection } from "@/components/support/FaqSection";
import { StatusBadge } from "@/components/ui/StatusBadge";

const FAQ_ITEMS = [
  { q: "How do I request access to an API?", a: "Browse the API catalog, find the API you need, then click 'Request Access'. You'll need to register an application first under 'My Applications'." },
  { q: "How long does access approval take?", a: "API owners typically review requests within 1–2 business days. You'll see the status update under 'My Subscriptions'." },
  { q: "What are mock credentials?", a: "Mock credentials are demo-only client IDs and secrets shown in your Application details. They are not real gateway credentials and cannot be used to call production APIs." },
  { q: "What does 'Deprecated' mean for an API?", a: "A deprecated API is still functional but is scheduled for retirement. You should plan to migrate to the recommended replacement. Check the API's lifecycle page for the retirement date." },
  { q: "How is the Governance Score calculated?", a: "The governance score is based on completed checklist reviews and automated linting checks. A score of 80%+ indicates the API meets enterprise standards." },
];

export default async function SupportPage() {
  const caller = await createCaller();
  const myTickets = await caller.support.myTickets().catch(() => []);

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Support Center</h1>
        <p className="text-slate-400 text-sm mt-1">Get help with the API Developer Portal</p>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Frequently Asked Questions</h2>
        <FaqSection items={FAQ_ITEMS} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Submit a Support Ticket</h2>
        <SupportTicketForm />
      </div>
      {myTickets.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">My Tickets</h2>
          <div className="space-y-2">
            {myTickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div>
                  <p className="text-white text-sm font-medium">{t.subject}</p>
                  <p className="text-slate-500 text-xs">{new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
