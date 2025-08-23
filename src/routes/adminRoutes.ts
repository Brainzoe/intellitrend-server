// src/routes/adminRoutes.ts
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
import { protect, adminOnly } from "../middleware/auth";
const router = Router();

// All admin routes protected
router.use(protect, adminOnly);

// ---------------- POSTS ----------------
router.get("/posts", getPosts);
router.post("/posts", addPost);
router.put("/posts/:id", updatePost);
router.delete("/posts/:id", deletePost);

// ---------------- COMMENTS & REPLIES ----------------
router.post("/posts/:postId/comment", addComment);
router.post("/posts/:postId/comment/:commentId/reply", addReply);

// ---------------- REACTIONS ----------------
router.post("/posts/:postId/reaction", addPostReaction); // post
router.post("/posts/:postId/comment/:commentId/reaction", addCommentReaction); // comment
router.post("/posts/:postId/comment/:commentId/reply/:replyId/reaction", addReplyReaction); // reply

// ---------------- SHARE ----------------
router.post("/posts/:postId/share", sharePost);

export default router;
