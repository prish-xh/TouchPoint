import { suggestRoutine } from "@/lib/server/gemini";
import { endpoint, readJson } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return endpoint(request, async () => suggestRoutine(await readJson(request.body, 4096)));
}
