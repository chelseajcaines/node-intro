import { type Request, type Response } from 'express'
import * as rest from '../utils/rest'
import Joi from 'joi'

const DEMO_BUDGETS: Budget[] = []
DEMO_BUDGETS.push({
  id: 12345,
  name: 'Take Out',
  amount: '50 monthly'
})

type amount = string

export interface Budget {
  id?: number
  name: string
  amount: amount
}

const BudgetSchema = Joi.object<Budget>({
  id: Joi.number().optional(),
  name: Joi.string().required(),
  amount: Joi.string().required()
})

export const createBudget = (req: Request, res: Response) => {
    const {error, value} = BudgetSchema.validate(req.body)
    if (error !== undefined) {
      return res.status(400).json(rest.error('Budget data is not formatted correctly'))
    }
  
    const budget = value;
    if ('id' in budget) {
      return res.status(400).json(rest.error('Budget ID will be generated automatically'))
    }
  
    const id = Math.floor(Math.random() * 1000000)
  
    const createdBudget = {
      ...budget,
      id
    }
    DEMO_BUDGETS.push(createdBudget)
  
    return res.status(200).json(rest.success(createdBudget))
}

export const getBudget = (req: Request, res: Response) => {
    const id = parseInt(req.params.id)
  if (Number.isNaN(id)) {
    return res.status(400).json(rest.error('Invalid budget ID'))
  }

  const budget = DEMO_BUDGETS.find(u => u.id === id)
  if (budget === undefined) {
    return res.status(404).json(rest.error('Budget not found'))
  }

  return res.status(200).json(rest.success(budget))
}

export const updateBudget = (req: Request, res: Response) => {
  const { error, value } = BudgetSchema.validate(req.body);
  if (error !== undefined) {
    return res.status(400).json(rest.error('Budget data is not formatted correctly'));
  }

  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json(rest.error('Invalid budget ID'));
  }

  const budgetIndex = DEMO_BUDGETS.findIndex(u => u.id === id);
  if (budgetIndex === -1) {
    return res.status(404).json(rest.error('Budget not found'));
  }

  DEMO_BUDGETS[budgetIndex] = { ...DEMO_BUDGETS[budgetIndex], ...value };

  return res.status(200).json(rest.success(DEMO_BUDGETS[budgetIndex]));
};

export const deleteBudget = (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json(rest.error('Invalid budget ID'));
  }

  const budgetIndex = DEMO_BUDGETS.findIndex(u => u.id === id);
  if (budgetIndex === -1) {
    return res.status(404).json(rest.error('Budget not found'));
  }

  DEMO_BUDGETS.splice(budgetIndex, 1);

  return res.status(200).json(rest.success({ message: 'Budget deleted successfully' }));
};