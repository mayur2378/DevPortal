"use client";

import { useState } from "react";
import { SpecDrivenPanel } from "./SpecDrivenPanel";
import { RequestBuilder } from "./RequestBuilder";
import { cn } from "@/lib/utils";
import type { OperationInfo } from "@/lib/spec-utils";

const tabs = ["Spec Explorer", "Request Builder"] as const;

interface Props {
  operations: OperationInfo[];
  versionId: string;
  specType: "REST" | "GRAPHQL";
}

export function MockTester({ operations, versionId, specType }: Props) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Spec Explorer");

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-slate-800">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === t ? "border-sky-500 text-sky-400" : "border-transparent text-slate-400 hover:text-white"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Spec Explorer" && (
        <SpecDrivenPanel operations={operations} versionId={versionId} specType={specType} />
      )}
      {tab === "Request Builder" && <RequestBuilder />}
    </div>
  );
}
