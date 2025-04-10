import { Router } from 'express'
import * as ExpenseController from '../controllers/expense'

const router = Router()

router.post('/', ExpenseController.createExpense)
router.get('/', ExpenseController.getExpense)
router.delete('/:id', ExpenseController.deleteExpense);
router.put('/:id', ExpenseController.updateExpense)

export default router