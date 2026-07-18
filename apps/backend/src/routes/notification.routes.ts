import { IRouter, Router } from "express";
import { proteger, restreindreA } from "../middlewares/auth.middleware";
import { injecterTenant } from "../middlewares/tenant.middleware";
import {
  compterNotificationsNonLues,
  listerNotifications,
  marquerNotificationCommeLue,
  marquerToutesNotificationsCommeLues,
} from "../controllers/notification.controller";

const router: IRouter = Router();

router.use(proteger);
router.use(injecterTenant);

router.get(
  "/non-lues/count",
  restreindreA("admin", "assistant"),
  compterNotificationsNonLues
);

router.get(
  "/non-lues",
  restreindreA("admin", "assistant"),
  listerNotifications
);

router.patch(
  "/lire-tout",
  restreindreA("admin", "assistant"),
  marquerToutesNotificationsCommeLues
);

router.patch(
  "/:id/lire",
  restreindreA("admin", "assistant"),
  marquerNotificationCommeLue
);

export default router;








// import { IRouter, Router } from "express";
// import { proteger, restreindreA } from "../middlewares/auth.middleware";
// import { injecterTenant } from "../middlewares/tenant.middleware";
// import {
//     compterNotificationsNonLues,
//     listerNotifications,
//     marquerNotificationCommeLue,
//     marquerToutesNotificationsCommeLues,
// } from "../controllers/notification.controller";

// const router: IRouter = Router();

// // Pattern standard des routes cabinet
// router.use(proteger);
// router.use(injecterTenant);

// // Lecture notifications : admin + assistant
// router.get(
//     "/",
//     restreindreA("admin", "assistant"),
//     listerNotifications
// );

// // Marquer une notification comme lue
// router.patch(
//     "/:id/lire",
//     restreindreA("admin", "assistant"),
//     marquerNotificationCommeLue
// );

// // Marquer toutes les notifications comme lues
// router.patch(
//     "/lire-tout",
//     restreindreA("admin", "assistant"),
//     marquerToutesNotificationsCommeLues
// );

// // Compter les notifications non lues
// router.get(
//     '/non-lues/count',
//     restreindreA('admin', 'assistant'),
//     compterNotificationsNonLues
// );

// export default router;