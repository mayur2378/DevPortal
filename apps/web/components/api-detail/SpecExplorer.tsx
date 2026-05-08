"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });
const GraphiQL = dynamic(() => import("graphiql").then((m) => m.GraphiQL), { ssr: false });

interface Props { versionId: string; specType: "REST" | "GRAPHQL" }

export function SpecExplorer({ versionId, specType }: Props) {
  const specUrl = `/api/spec/${versionId}`;

  if (specType === "REST") {
    return (
      <div className="rounded-xl overflow-hidden border border-slate-800">
        <SwaggerUI url={specUrl} />
      </div>
    );
  }

  return (
    <div className="h-[600px] rounded-xl overflow-hidden border border-slate-800">
      <GraphiQL
        fetcher={async (graphQLParams) => {
          const res = await fetch(`/api/mock/graphql/${versionId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(graphQLParams),
          });
          return res.json();
        }}
      />
    </div>
  );
}
