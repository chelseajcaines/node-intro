import { Router } from 'express'
import * as SavingsController from '../controllers/savings'

const router = Router()

router.post('/', SavingsController.createSaving)
// router.get('/:id', IncomeController.getIncome)
// router.put('/:id', IncomeController.updateIncome)
// router.delete('/:id', IncomeController.deleteIncome)

export default router