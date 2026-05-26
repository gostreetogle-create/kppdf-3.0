import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import type { IUser } from '../../../../shared/types/user.interface';

// Note: Omit<IUser, '_id'> — иначе конфликт string vs ObjectId с Document._id
export interface IUserDocument extends Omit<IUser, '_id'>, Document {
  passwordHash: string;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUserDocument>(
  {
    username: { type: String, required: true, unique: true, lowercase: true },
    email: { type: String, unique: true, sparse: true, lowercase: true },
    displayName: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, default: 'viewer' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: String },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  next();
});

export const UserModel = mongoose.model<IUserDocument>('User', userSchema);
