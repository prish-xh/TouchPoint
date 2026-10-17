import { createPerceptronClient } from "@/lib/perceptron";
import { endpoint, readJson } from "@/lib/server/http";
import { scanRequestSchema } from "@/lib/validation";
export const runtime = "nodejs";
export const maxDuration = 90;
export async function POST(request: Request) {
  return endpoint(request, async () => createPerceptronClient().scan(scanRequestSchema.parse(await readJson(request.body, 3_010_000))));
}
