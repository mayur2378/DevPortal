import { Router } from "express";
import { readSpec } from "@devportal/db";
import { generateGraphQLResponse } from "../generators/graphql";

export const graphqlRouter = Router();

graphqlRouter.post("/graphql", async (req, res) => {
  const { specKey, query } = req.body as {
    specKey: string;
    query: string;
    variables?: Record<string, unknown>;
  };

  if (!specKey || !query) {
    return res.status(400).json({ error: "specKey and query are required" });
  }

  try {
    const buffer = await readSpec(specKey);
    const sdl = buffer.toString("utf8");
    const result = await generateGraphQLResponse(sdl, query);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ errors: [{ message: err.message }] });
  }
});
