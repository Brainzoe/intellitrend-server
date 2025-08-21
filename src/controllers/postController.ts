// src/controllers/postController.ts
// src/controllers/postController.ts
import { Request, Response } from "express";
import Post from "../models/Post";
import { findCommentById, applyReaction } from "./utils";

// -------------------- GET ALL POSTS --------------------
export const getPosts = async (_req: Request, res: Response) => {
  try {
    const posts = await Post.find();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

// -------------------- ADD POST --------------------
export const addPost = async (req: Request, res: Response) => {
  try {
    const { title, content, author, category } = req.body;
    const newPost = new Post({
      title,
      content,
      author,
      category,
      comments: [],
      reactions: {},
      reactedBy: {}, // ✅ stores per-user reaction
      shares: 0,
    });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

// -------------------- UPDATE POST --------------------
export const updatePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, author, category } = req.body;

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { title, content, author, category },
      { new: true }
    );

    if (!updatedPost) return res.status(404).json({ message: "Post not found" });
    res.json(updatedPost);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

// -------------------- DELETE POST --------------------
export const deletePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedPost = await Post.findByIdAndDelete(id);

    if (!deletedPost) return res.status(404).json({ message: "Post not found" });
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

// -------------------- ADD COMMENT --------------------
export const addComment = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { author, text } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.comments.push({
      author,
      text,
      date: new Date(),
      replies: [],
      reactions: {},
      reactedBy: {}, // ✅ each comment tracks per-user reaction
    } as any);

    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

// -------------------- ADD REPLY (NESTED) --------------------
export const addReply = async (req: Request, res: Response) => {
  try {
    const { postId, commentId } = req.params;
    const { author, text } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const target = findCommentById(post.comments as any, commentId);
    if (!target) return res.status(404).json({ message: "Comment/Reply not found" });

    target.replies.push({
      author,
      text,
      date: new Date(),
      replies: [],
      reactions: {},
      reactedBy: {}, // ✅ same fix
    } as any);

    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

// -------------------- REACT TO POST --------------------
export const addPostReaction = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { type, userId } = req.body;

    if (!userId || !type)
      return res.status(400).json({ message: "userId and type required" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    applyReaction(post, type, userId); // ✅ handles multiple reactions properly
    post.markModified("reactions");
    post.markModified("reactedBy");
    await post.save();

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

// -------------------- REACT TO COMMENT (ANY DEPTH) --------------------
export const addCommentReaction = async (req: Request, res: Response) => {
  try {
    const { postId, commentId } = req.params;
    const { type, userId } = req.body;

    if (!userId || !type)
      return res.status(400).json({ message: "userId and type required" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = findCommentById(post.comments as any, commentId);
    if (!comment) return res.status(404).json({ message: "Comment/Reply not found" });

    applyReaction(comment, type, userId);
    post.markModified("comments"); 
    await post.save();

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

// -------------------- REACT TO REPLY (EXPLICIT) --------------------
export const addReplyReaction = async (req: Request, res: Response) => {
  try {
    const { postId, commentId, replyId } = req.params;
    const { type, userId } = req.body;

    if (!userId || !type)
      return res.status(400).json({ message: "userId and type required" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const top = findCommentById(post.comments as any, commentId);
    if (!top) return res.status(404).json({ message: "Top-level comment not found" });

    const target = findCommentById(top.replies as any, replyId);
    if (!target) return res.status(404).json({ message: "Reply not found" });

    applyReaction(target, type, userId);
    post.markModified("comments"); 
    await post.save();

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

// -------------------- SHARE POST --------------------
export const sharePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.shares = (post.shares || 0) + 1;
    await post.save();

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

