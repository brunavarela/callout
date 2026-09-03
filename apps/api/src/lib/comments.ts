import type { CommentDTO } from "@callout/shared";
import type { Comment, User } from "@prisma/client";
import { prisma } from "./prisma.js";
import { resolveDisplayName, resolveAvatarUrl } from "./dto.js";

function formatCreatedAt(date: Date, now: Date): string {
  const diffMin = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  return `há ${Math.round(diffH / 24)} d`;
}

export function toCommentDTO(comment: Comment & { user: User }): CommentDTO {
  return {
    id: comment.id,
    entidadeTipo: comment.entidadeTipo as CommentDTO["entidadeTipo"],
    entidadeId: comment.entidadeId,
    authorName: resolveDisplayName(comment.user),
    authorAvatarUrl: resolveAvatarUrl(comment.user),
    createdAtLabel: formatCreatedAt(comment.createdAt, new Date()),
    text: comment.texto,
  };
}

export async function listComments(entidadeTipo: string, entidadeId: string): Promise<CommentDTO[]> {
  const rows = await prisma.comment.findMany({
    where: { entidadeTipo, entidadeId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => toCommentDTO(row));
}
