import { Request, Response } from 'express';
import * as rest from '../utils/rest';
import Joi from 'joi';
import pool from '../db';

// Define the Category interface
export interface Category {
    id?: number;
    name: string;
}

// Define the validation schema for Category
const CategorySchema = Joi.object<Category>({
    id: Joi.number().optional(),
    name: Joi.string().required(),
});

// Create a new category
export const createCategory = async (req: Request, res: Response) => {
    const { error, value } = CategorySchema.validate(req.body);
    if (error !== undefined) {
        return res.status(400).json(rest.error('Category data is not formatted correctly'));
    }

    const category = value;

    try {
        const result = await pool.query(
            'INSERT INTO Categories (name) VALUES ($1) RETURNING *',
            [category.name]
        );
        return res.status(201).json(rest.success(result.rows[0]));
    } catch (err) {
        console.error('Error creating category:', err);
        return res.status(500).json(rest.error('Error creating category'));
    }
};

// Get a category by ID
export const getCategory = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json(rest.error('Invalid category ID'));
    }

    try {
        const result = await pool.query('SELECT * FROM Categories WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json(rest.error('Category not found'));
        }
        return res.status(200).json(rest.success(result.rows[0]));
    } catch (err) {
        return res.status(500).json(rest.error('Error retrieving category'));
    }
};

// Update a category by ID
export const updateCategory = async (req: Request, res: Response) => {
    const { error, value } = CategorySchema.validate(req.body);
    if (error !== undefined) {
        return res.status(400).json(rest.error('Category data is not formatted correctly'));
    }

    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json(rest.error('Invalid category ID'));
    }

    try {
        const result = await pool.query(
            'UPDATE Categories SET name = $1 WHERE id = $2 RETURNING *',
            [value.name, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json(rest.error('Category not found'));
        }
        return res.status(200).json(rest.success(result.rows[0]));
    } catch (err) {
        return res.status(500).json(rest.error('Error updating category'));
    }
};

// Delete a category by ID
export const deleteCategory = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json(rest.error('Invalid category ID'));
    }

    try {
        const result = await pool.query('DELETE FROM Categories WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json(rest.error('Category not found'));
        }
        return res.status(200).json(rest.success({ message: 'Category deleted successfully' }));
    } catch (err) {
        return res.status(500).json(rest.error('Error deleting category'));
    }
};