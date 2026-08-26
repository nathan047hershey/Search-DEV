import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  name?: string;
  image?: string;
  password?: string;
  emailVerified?: Date;
  accounts?: {
    provider: string;
    providerAccountId: string;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    password: {
      type: String,
    },
    emailVerified: {
      type: Date,
    },
    accounts: [
      {
        provider: String,
        providerAccountId: String,
        access_token: String,
        refresh_token: String,
        expires_at: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
UserSchema.index({ email: 1 });

const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
