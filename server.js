import "dotenv/config";
import express from "express";
import cors from "cors";
import emissionsRouter from "./routes/emissions.js";
import mockEmissionsRouter from "./routes/mock/emissions.js";
import ndcCockpitRouter from "./routes/ndcCockpit.js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "uganda-ndc-api" });
});

app.use("/api/v1/mock", mockEmissionsRouter);

app.use("/api/v1", ndcCockpitRouter);

const useMock = process.env.USE_MOCK_DATA === "true";
app.use("/api/v1", useMock ? mockEmissionsRouter : emissionsRouter);

const port = Number(process.env.API_PORT || 8787);
app.listen(port, () => {
  console.log(`NDC API listening on http://localhost:${port}`);
  console.log(`  USE_MOCK_DATA=${useMock} (${useMock ? "mock" : "live DB + Climate TRACE"})`);
});
