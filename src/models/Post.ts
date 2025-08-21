// src/models/Post.ts
// src/models/Post.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  author: string;
  text: string;
  date: Date;
  replies: IComment[];
  reactions: Record<string, number>;   // counts per type
  reactedBy: Record<string, string>;   // userId -> type
}

export interface IPost extends Document {
  title: string;
  content: string;
  author: string;
  category?: string;
  date: Date;
  comments: IComment[];
  reactions: Record<string, number>;   // counts per type
  reactedBy: Record<string, string>;   // userId -> type
  shares: number;
}

const BaseCommentSchema = new Schema<IComment>(
  {
    author: { type: String, required: true },
    text: { type: String, required: true },
    date: { type: Date, default: Date.now },
    reactions: { type: Map, of: Number, default: {} },
    reactedBy: { type: Map, of: String, default: {} },
    replies: [],
  },
  { _id: true }
);

BaseCommentSchema.add({
  replies: [BaseCommentSchema],
});

const PostSchema = new Schema<IPost>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true },
    category: { type: String },
    date: { type: Date, default: Date.now },
    comments: [BaseCommentSchema],
    reactions: { type: Map, of: Number, default: {} },
    reactedBy: { type: Map, of: String, default: {} },
    shares: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IPost>("Post", PostSchema);
