import { AgentUpdateSchema } from "app-types/agent";
import { getApiSession } from "auth/server";
import { agentRepository } from "lib/db/repository";
import { z } from "zod";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const hasAccess = await agentRepository.checkAccess(id, session.user.id);
  if (!hasAccess) {
    // Foreign/missing agents look the same (no existence leak)
    return Response.json({ error: "Agent not found" }, { status: 404 });
  }

  const agent = await agentRepository.selectAgentById(id, session.user.id);
  if (!agent) {
    return Response.json({ error: "Agent not found" }, { status: 404 });
  }
  return Response.json(agent);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const data = AgentUpdateSchema.parse(body);

    // Write access is owner-only ("public" grants use, never edit)
    const agent = await agentRepository.updateAgent(id, session.user.id, data);
    if (!agent) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    return Response.json(agent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.message },
        { status: 400 },
      );
    }

    console.error("Failed to update agent:", error);
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;
    const hasAccess = await agentRepository.checkAccess(
      id,
      session.user.id,
      true, // destructive = true for delete operations
    );
    if (!hasAccess) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }
    await agentRepository.deleteAgent(id, session.user.id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete agent:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
