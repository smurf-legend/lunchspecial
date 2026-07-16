// Comments can nest to any depth (reply to a reply to a reply...), so we
// fetch them flat and assemble the tree here rather than relying on a
// fixed-depth Prisma `include`, which can't express arbitrary recursion.
import { prisma } from "@/lib/prisma";

// The self-relation's FK is onDelete: NoAction (not Cascade), so deleting a
// comment with replies would violate the FK unless descendants go first.
// Deletes bottom-up (post-order) to guarantee that regardless of how deep
// the thread is.
export async function deleteCommentAndDescendants(commentId: string): Promise<void> {
  const children = await prisma.comment.findMany({
    where: { parentId: commentId },
    select: { id: true },
  });
  for (const child of children) {
    await deleteCommentAndDescendants(child.id);
  }
  await prisma.comment.delete({ where: { id: commentId } });
}

// Same as above but for BlogComment — a separate Prisma model (not a
// polymorphic relation), so it needs its own delete function.
export async function deleteBlogCommentAndDescendants(commentId: string): Promise<void> {
  const children = await prisma.blogComment.findMany({
    where: { parentId: commentId },
    select: { id: true },
  });
  for (const child of children) {
    await deleteBlogCommentAndDescendants(child.id);
  }
  await prisma.blogComment.delete({ where: { id: commentId } });
}

export function buildCommentTree<T extends { id: string; parentId: string | null }>(
  flat: T[]
): (T & { replies: (T & { replies: any[] })[] })[] {
  const byId = new Map<string, T & { replies: any[] }>();
  flat.forEach((c) => byId.set(c.id, { ...c, replies: [] }));

  const roots: (T & { replies: any[] })[] = [];
  byId.forEach((c) => {
    const parent = c.parentId ? byId.get(c.parentId) : undefined;
    if (parent) parent.replies.push(c);
    else roots.push(c);
  });

  return roots;
}

export function countComments(nodes: { replies: any[] }[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countComments(n.replies), 0);
}
