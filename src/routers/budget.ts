import { Router } from 'express'
import * as BudgetController from '../controllers/budget'

const router = Router()

router.post('/', BudgetController.createBudget)
router.get('/:id', BudgetController.getBudget)
router.put('/:id', BudgetController.updateBudget)
router.delete('/:id', BudgetController.deleteBudget)

export default router