import { getApiSession } from "auth/server";
import { chatRepository } from "lib/db/repository";

export async function GET() {
  const session = await getApiSession();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const threads = await chatRepository.selectThreadsByUserId(session.user.id);
  return Response.json(threads);
}
