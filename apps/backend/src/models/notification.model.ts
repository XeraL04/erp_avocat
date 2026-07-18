import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  tenantId: mongoose.Types.ObjectId;
  utilisateurId?: mongoose.Types.ObjectId;
  evenement: mongoose.Types.ObjectId;
  dossier?: mongoose.Types.ObjectId;

  titre: string;
  message: string;
  type: 'evenement' | 'rappel' | 'audience' | 'rdv';

  canal: 'in_app';
  statut: 'non_lue' | 'lue';

  dateNotification: Date;
  dateLecture?: Date;

  cleDeduplication: string;

  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    utilisateurId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    evenement: {
      type: Schema.Types.ObjectId,
      ref: 'Evenement',
      required: true,
      index: true,
    },
    dossier: {
      type: Schema.Types.ObjectId,
      ref: 'Dossier',
      required: false,
      index: true,
    },
    titre: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['evenement', 'rappel', 'audience', 'rdv'],
      required: true,
      default: 'rappel',
    },
    canal: {
      type: String,
      enum: ['in_app'],
      required: true,
      default: 'in_app',
    },
    statut: {
      type: String,
      enum: ['non_lue', 'lue'],
      required: true,
      default: 'non_lue',
    },
    dateNotification: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    dateLecture: {
      type: Date,
      required: false,
    },
    cleDeduplication: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index métier
notificationSchema.index(
  { tenantId: 1, cleDeduplication: 1 },
  { unique: true }
);

notificationSchema.index({ tenantId: 1, statut: 1, dateNotification: -1 });
notificationSchema.index({ tenantId: 1, utilisateurId: 1, statut: 1 });
notificationSchema.index({ tenantId: 1, evenement: 1 });
notificationSchema.index({ tenantId: 1, dossier: 1, dateNotification: -1 });

export const Notification = mongoose.model<INotification>(
  'Notification',
  notificationSchema
);