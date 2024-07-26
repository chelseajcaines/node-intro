import { type Request, type Response } from 'express'
import * as rest from '../utils/rest'
import Joi from 'joi'

const DEMO_EXPENSES: Expense[] = []
DEMO_EXPENSES.push({
  id: 1,
  name: 'Groceries',
  amount: '100 monthly',
  date: '2024-07-25'
})

type amount = string

export interface Expense {
  id?: number
  name: string
  amount: amount
  date: string
}

const ExpenseSchema = Joi.object<Expense>({
  id: Joi.number().optional(),
  name: Joi.string().required(),
  amount: Joi.string().required(),
  date: Joi.string().isoDate().required()
})

export const createExpense = (req: Request, res: Response) => {
    const {error, value} = ExpenseSchema.validate(req.body)
    if (error !== undefined) {
        return res.status(400).json(rest.error('Expense data is not formatted correctly'))
    }

    const expense = value;
    if ('id' in expense) {
        return res.status(400).json(rest.error('Expense ID will be generated automatically'))
    }

    const id = Math.floor(Math.random() * 1000000)

    const createdExpense = {
        ...expense,
        id
    }
    DEMO_EXPENSES.push(createdExpense)

    return res.status(200).json(rest.success(createdExpense))
}

export const getExpense = (req: Request, res: Response) => {
    const id = parseInt(req.params.id)
    if (Number.isNaN(id)) {
        return res.status(400).json(rest.error('Invalid expense ID'))
    }

    const expense = DEMO_EXPENSES.find(e => e.id === id)
    if (expense === undefined) {
        return res.status(404).json(rest.error('Expense not found'))
    }

    return res.status(200).json(rest.success(expense))
}

export const updateExpense = (req: Request, res: Response) => {
    const { error, value } = ExpenseSchema.validate(req.body)
    if (error !== undefined) {
        return res.status(400).json(rest.error('Expense data is not formatted correctly'))
    }

    const id = parseInt(req.params.id)
    if (Number.isNaN(id)) {
        return res.status(400).json(rest.error('Invalid expense ID'))
    }

    const expenseIndex = DEMO_EXPENSES.findIndex(e => e.id === id)
    if (expenseIndex === -1) {
        return res.status(404).json(rest.error('Expense not found'))
    }

    DEMO_EXPENSES[expenseIndex] = { ...DEMO_EXPENSES[expenseIndex], ...value }

    return res.status(200).json(rest.success(DEMO_EXPENSES[expenseIndex]))
}

export const deleteExpense = (req: Request, res: Response) => {
    const id = parseInt(req.params.id)
    if (Number.isNaN(id)) {
        return res.status(400).json(rest.error('Invalid expense ID'))
    }

    const expenseIndex = DEMO_EXPENSES.findIndex(e => e.id === id)
    if (expenseIndex === -1) {
        return res.status(404).json(rest.error('Expense not found'))
    }

    DEMO_EXPENSES.splice(expenseIndex, 1)

    return res.status(200).json(rest.success({ message: 'Expense deleted successfully' }))
}

