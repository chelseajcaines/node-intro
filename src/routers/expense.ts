import { Router } from 'express'
import * as ExpenseController from '../controllers/expense'

const router = Router()

router.post('/', ExpenseController.createExpense)
router.get('/', ExpenseController.getExpense)

export default router