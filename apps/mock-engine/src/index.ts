import express from "express";
import cors from "cors";
import { restRouter } from "./routes/rest";
import { graphqlRouter } from "./routes/graphql";

const app = express();
const PORT = process.env.MOCK_ENGINE_PORT ?? 3001;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/mock", restRouter);
app.use("/mock", graphqlRouter);

app.listen(PORT, () => {
  console.log(`Mock engine running on http://localhost:${PORT}`);
});
