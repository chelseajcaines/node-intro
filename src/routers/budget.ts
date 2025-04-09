import { Router } from 'express'
import * as BudgetController from '../controllers/budget'

const router = Router()

router.post('/', BudgetController.createBudget)
router.get('/', BudgetController.getBudget);
router.delete('/:id', BudgetController.deleteBudget);

export default router