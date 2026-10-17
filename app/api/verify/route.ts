import { createPerceptronClient } from "@/lib/perceptron";
import { endpoint, readJson } from "@/lib/server/http";
import { verifyRequestSchema } from "@/lib/validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return endpoint(request, async () => createPerceptronClient().verify(verifyRequestSchema.parse(await readJson(request.body, 3_010_000))));
}
