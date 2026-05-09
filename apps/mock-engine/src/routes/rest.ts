import { Router } from "express";
import { readSpec } from "@devportal/db";
import { generateOpenApiResponse } from "../generators/openapi";
import yaml from "js-yaml";

export const restRouter = Router();

restRouter.post("/rest", async (req, res) => {
  const { specKey, operationId, preferredStatus } = req.body as {
    specKey: string;
    operationId: string;
    preferredStatus?: string;
  };

  if (!specKey || !operationId) {
    return res.status(400).json({ error: "specKey and operationId are required" });
  }

  try {
    const buffer = await readSpec(specKey);
    const text = buffer.toString("utf8");
    const spec = text.trim().startsWith("{") ? JSON.parse(text) : yaml.load(text);
    const mock = await generateOpenApiResponse(spec as any, operationId, preferredStatus ?? "200");
    if (mock.body === null || mock.body === undefined) {
      return res.status(mock.statusCode).end();
    }
    return res.status(mock.statusCode).set(mock.headers).json(mock.body);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
