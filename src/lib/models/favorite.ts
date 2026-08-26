import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFavorite extends Document {
  userId: string;
  githubId: number;
  login: string;
  avatarUrl: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  htmlUrl: string;
  email: string | null;
  createdAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    userId: { type: String, required: true, index: true },
    githubId: { type: Number, required: true },
    login: { type: String, required: true },
    avatarUrl: { type: String, required: true },
    name: { type: String, default: null },
    bio: { type: String, default: null },
    location: { type: String, default: null },
    publicRepos: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    htmlUrl: { type: String, required: true },
    email: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure a user can't favorite the same developer twice
FavoriteSchema.index({ userId: 1, githubId: 1 }, { unique: true });

export const Favorite: Model<IFavorite> =
  mongoose.models.Favorite || mongoose.model<IFavorite>("Favorite", FavoriteSchema);
