import { Router } from 'express'
import * as UserController from '../controllers/user'

const router = Router()

router.post('/', UserController.createUser)
router.post('/login', UserController.loginUser)
router.get('/validate', UserController.validateUser)
router.post('/logout', UserController.logoutUser);

export default router