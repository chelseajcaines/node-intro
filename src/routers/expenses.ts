import { Router } from 'express'
import * as ExpensesController from '../controllers/expenses'

const router = Router()

router.post('/', ExpensesController.createExpense)
router.get('/:id', ExpensesController.getExpense)
router.put('/:id', ExpensesController.updateExpense)
router.delete('/:id', ExpensesController.deleteExpense)

export default router