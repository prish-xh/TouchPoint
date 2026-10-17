import { createPreferenceStore } from "@/lib/server/backboard";
import { endpoint, readJson } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return endpoint(request, async () => ({ preferences: await createPreferenceStore().read() }));
}
export async function PUT(request: Request) {
  return endpoint(request, async () => ({ preferences: await createPreferenceStore().save(await readJson(request.body, 2048)) }));
}
export async function DELETE(request: Request) {
  return endpoint(request, async () => createPreferenceStore().remove());
}
