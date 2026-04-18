import mongoose, { Document, Schema } from 'mongoose';

export interface IInstitutionPersonnalisee extends Document {
  tenantId:  mongoose.Types.ObjectId;
  nom:       string;
  createdAt: Date;
}

const schema = new Schema<IInstitutionPersonnalisee>(
  {
    tenantId: {
      type:     mongoose.Schema.Types.ObjectId,
      required: true,
      ref:      'Tenant',
    },
    nom: {
      type:     String,
      required: true,
      trim:     true,
    },
  },
  { timestamps: true }
);

// Unicité par cabinet
schema.index({ tenantId: 1, nom: 1 }, { unique: true });

export default mongoose.model<IInstitutionPersonnalisee>(
  'InstitutionPersonnalisee',
  schema
);