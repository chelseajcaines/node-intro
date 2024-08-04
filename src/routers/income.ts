import { Router } from 'express'
import * as IncomeController from '../controllers/income'

const router = Router()

router.post('/', IncomeController.createIncome)
router.get('/:id', IncomeController.getIncome)
router.put('/:id', IncomeController.updateIncome)
router.delete('/:id', IncomeController.deleteIncome)

export default router