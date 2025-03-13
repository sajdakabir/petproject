import { Router } from "express";
import { registerEmailUserController, emailLoginController, magicLoginController, validateLoginMagicLinkController, authenticateWithGoogleController, logOutController } from "../../controllers/core/auth.controller.js";

const router = Router();
router.route('/common/signup/').post(registerEmailUserController);
router.route('/common/login/').post(emailLoginController);
router.route('/magic/login/').post(magicLoginController);
router.route('/magic/verify/').post(validateLoginMagicLinkController);
router.route('/google/login/').post(authenticateWithGoogleController);
router.route('/logout/').post(logOutController);

export default router;
