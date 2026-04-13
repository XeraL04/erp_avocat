import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  nom: string;
  email: string;
  motDePasse: string;
  role: 'superadmin' | 'admin' | 'assistant';
  tenantId?: mongoose.Types.ObjectId;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparerMotDePasse(motDePasse: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    nom: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    motDePasse: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'assistant'],
      default: 'admin',
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: function (this: IUser) {
        return this.role !== 'superadmin';
      },
    },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index pour éviter qu'un même email existe dans deux cabinets différents
userSchema.index({ tenantId: 1, email: 1 });

// Hash du mot de passe avant sauvegarde
userSchema.pre('save', async function (next) {
  if (!this.isModified('motDePasse')) return next();
  this.motDePasse = await bcrypt.hash(this.motDePasse, 12);
  next();
});

// Méthode de comparaison du mot de passe
userSchema.methods.comparerMotDePasse = async function (motDePasse: string): Promise<boolean> {
  return bcrypt.compare(motDePasse, this.motDePasse);
};

export const User = mongoose.model<IUser>('User', userSchema);
