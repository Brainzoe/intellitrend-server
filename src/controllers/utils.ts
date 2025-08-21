//src/controllers/utils.ts
// src/controllers/utils.ts
import { IComment, IPost } from "../models/Post";

// 🔍 Recursively find a comment or reply by id
export const findCommentById = (comments: IComment[], id: string): IComment | null => {
  for (const comment of comments) {
    if (comment._id.toString() === id) return comment;
    const found = findCommentById(comment.replies, id);
    if (found) return found;
  }
  return null;
};

// ✅ Apply a reaction with toggle logic
// src/controllers/utils.ts

/**
 * Handles adding/removing/toggling reactions for posts, comments, and replies.
 */
// export const applyReaction = (target: any, type: string, userId: string) => {
//     if (!target.reactions) target.reactions = {};
//     if (!target.reactedBy) target.reactedBy = {};

//     const prevReaction = target.reactedBy[userId];

//     if (prevReaction === type) {
//       // 🔄 Same reaction clicked again → remove it
//       target.reactions[type] = (target.reactions[type] || 1) - 1;
//       if (target.reactions[type] <= 0) delete target.reactions[type];
//       delete target.reactedBy[userId];
//     } else {
//       // 🔄 Switching reaction or new reaction
//       if (prevReaction) {
//         // Decrease previous reaction count
//         target.reactions[prevReaction] = (target.reactions[prevReaction] || 1) - 1;
//         if (target.reactions[prevReaction] <= 0) delete target.reactions[prevReaction];
//       }
//       // Add new one
//       target.reactions[type] = (target.reactions[type] || 0) + 1;
//       target.reactedBy[userId] = type;
//     }
//   };
export const applyReaction = (target: any, type: string, userId: string) => {
  if (!target.reactions) target.reactions = new Map();
  if (!target.reactedBy) target.reactedBy = new Map();

  const prevReaction = target.reactedBy.get(userId);

  if (prevReaction === type) {
    // remove
    const count = (target.reactions.get(type) || 1) - 1;
    if (count > 0) target.reactions.set(type, count);
    else target.reactions.delete(type);
    target.reactedBy.delete(userId);
  } else {
    if (prevReaction) {
      const oldCount = (target.reactions.get(prevReaction) || 1) - 1;
      if (oldCount > 0) target.reactions.set(prevReaction, oldCount);
      else target.reactions.delete(prevReaction);
    }
    target.reactions.set(type, (target.reactions.get(type) || 0) + 1);
    target.reactedBy.set(userId, type);
  }
};

const syncReaction = (
  postId: string,
  commentId: string | null,
  userId: string,
  reaction: string,
  action: "add" | "remove" | "switch"
) => {
  fetch(`/api/posts/${postId}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commentId, userId, reaction, action }),
  }).catch((err) => console.error("Failed to sync reaction:", err));
};
