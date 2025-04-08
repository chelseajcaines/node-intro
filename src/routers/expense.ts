import { Router } from 'express'
import * as ExpenseController from '../controllers/expense'

const router = Router()

router.post('/', ExpenseController.createExpense)
router.get('/', ExpenseController.getExpense)
// router.put('/:id', IncomeController.updateIncome)
// router.delete('/:id', IncomeController.deleteIncome)

export default router