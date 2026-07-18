import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Notification } from "../models/notification.model";
import { AppError } from "../middlewares/error-handler";
import { sendSuccess } from "../utils/api-response";

/**
 * GET /api/cabinet/notifications/non-lues
 * Liste uniquement les notifications non lues du cabinet connecté.
 * Pagination :
 * - page
 * - limit
 */
export const listerNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const skip = (page - 1) * limit;

    const filtre = {
      tenantId,
      statut: "non_lue",
    };

    const [notifications, total, totalNonLues] = await Promise.all([
      Notification.find(filtre)
        .populate("evenement", "titre type dateHeure lieu")
        .populate("dossier", "reference titre type")
        .sort({ dateNotification: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Notification.countDocuments(filtre),

      Notification.countDocuments({
        tenantId,
        statut: "non_lue",
      }),
    ]);

    sendSuccess(
      res,
      { notifications },
      200,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        totalNonLues,
      }
    );
  } catch (erreur) {
    next(erreur);
  }
};

/**
 * PATCH /api/cabinet/notifications/:id/lire
 * Marque une notification comme lue.
 */
export const marquerNotificationCommeLue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = req.utilisateur!.tenantId!;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(
        "Identifiant notification invalide",
        "ID_INVALIDE",
        400
      );
    }

    const notification = await Notification.findOne({
      _id: id,
      tenantId,
    });

    if (!notification) {
      throw new AppError(
        "Notification introuvable",
        "NOTIFICATION_INTROUVABLE",
        404
      );
    }

    if (notification.statut === "lue") {
      const notificationExistante = await Notification.findById(notification._id)
        .populate("evenement", "titre type dateHeure lieu")
        .populate("dossier", "reference titre type")
        .lean();

      sendSuccess(res, { notification: notificationExistante });
      return;
    }

    notification.statut = "lue";
    notification.dateLecture = new Date();

    await notification.save();

    const notificationMaj = await Notification.findById(notification._id)
      .populate("evenement", "titre type dateHeure lieu")
      .populate("dossier", "reference titre type")
      .lean();

    sendSuccess(res, { notification: notificationMaj });
  } catch (erreur) {
    next(erreur);
  }
};

/**
 * PATCH /api/cabinet/notifications/lire-tout
 * Marque toutes les notifications non lues du cabinet comme lues.
 */
export const marquerToutesNotificationsCommeLues = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const maintenant = new Date();

    const resultat = await Notification.updateMany(
      {
        tenantId,
        statut: "non_lue",
      },
      {
        $set: {
          statut: "lue",
          dateLecture: maintenant,
        },
      }
    );

    sendSuccess(res, {
      message: "Toutes les notifications ont été marquées comme lues",
      totalModifiees: resultat.modifiedCount,
    });
  } catch (erreur) {
    next(erreur);
  }
};

/**
 * GET /api/cabinet/notifications/non-lues/count
 * Retourne le nombre de notifications non lues du cabinet courant.
 */
export const compterNotificationsNonLues = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    const count = await Notification.countDocuments({
      tenantId,
      statut: "non_lue",
    });

    sendSuccess(res, { count });
  } catch (erreur) {
    next(erreur);
  }
};