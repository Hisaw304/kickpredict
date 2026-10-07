import { parsePredictionRequest } from "./parser.js";

console.log(
  parsePredictionRequest(
    "give me 10 safe picks tomorrow",
    new Date("2026-10-02T10:00:00Z")
  )
);
