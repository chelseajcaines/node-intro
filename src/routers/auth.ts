import { Router } from 'express';
import * as AuthController from '../controllers/auth';

const router = Router();

router.post('/forgot-password', AuthController.forgotPassword);  // Handles forgot password
router.post('/reset-password', AuthController.resetPassword);  // Handles resetting the password

export default router;