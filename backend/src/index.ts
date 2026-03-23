import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { analyzeRouter } from "./routes/analyze";
import { mergeRouter } from "./routes/merge";

dotenv.config();

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", analyzeRouter);
app.use("/api/merge", mergeRouter);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});
