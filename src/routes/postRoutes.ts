// src/routes/postRoutes.ts
// src/routes/postRoutes.ts
import { Router } from "express";
import {
  getPosts,
  addPost,
  updatePost,
  deletePost,
  addComment,
  addReply,
  addPostReaction,
  addCommentReaction,
  addReplyReaction,
  sharePost,
} from "../controllers/postController";

const router = Router();

// ---------------- POSTS ----------------
router.get("/", getPosts);
router.post("/", addPost);
router.put("/:id", updatePost);
router.delete("/:id", deletePost);

// ---------------- COMMENTS & REPLIES ----------------
router.post("/:postId/comment", addComment);
router.post("/:postId/comment/:commentId/reply", addReply);

// ---------------- REACTIONS ----------------
router.post("/:postId/reaction", addPostReaction); // post
router.post("/:postId/comment/:commentId/reaction", addCommentReaction); // comment
router.post("/:postId/comment/:commentId/reply/:replyId/reaction", addReplyReaction); // reply

// ---------------- SHARE ----------------
router.post("/:postId/share", sharePost);

export default router;
