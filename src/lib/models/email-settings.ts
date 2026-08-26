import mongoose, { Schema, Document } from "mongoose";

export interface IEmailSettings extends Document {
  userId: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpPassword: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmailSettingsSchema = new Schema<IEmailSettings>({
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  smtpHost: { type: String, required: true },
  smtpPort: { type: Number, required: true, default: 587 },
  smtpSecure: { type: Boolean, default: false },
  smtpPassword: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

EmailSettingsSchema.index({ userId: 1 });

const EmailSettings = mongoose.models.EmailSettings || mongoose.model<IEmailSettings>("EmailSettings", EmailSettingsSchema);

export default EmailSettings;
