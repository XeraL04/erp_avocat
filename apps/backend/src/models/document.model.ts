import mongoose, { Document, Schema } from 'mongoose';

export interface IDocument extends Document {
  tenantId: mongoose.Types.ObjectId;
  nom: string;
  type: 'contrat' | 'jugement' | 'piece' | 'autre';
  dossier: mongoose.Types.ObjectId;
  url: string;
  cloudinaryId: string;
  description?: string;
  taille?: number;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    nom: { type: String, required: true, trim: true },
    type: { type: String, enum: ['contrat', 'jugement', 'piece', 'autre'], required: true },
    dossier: { type: Schema.Types.ObjectId, ref: 'Dossier', required: true },
    url: { type: String, required: true },
    cloudinaryId: { type: String, required: true },
    description: { type: String },
    taille: { type: Number },
  },
  { timestamps: true }
);

documentSchema.index({ dossier: 1 });

documentSchema.index({ tenantId: 1 });
documentSchema.index({ tenantId: 1, dossier: 1 });

export const DocumentModel = mongoose.model<IDocument>('Document', documentSchema);
