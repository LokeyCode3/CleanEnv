import { Request, Response } from 'express';
import { IssueCategory } from '../models/IssueCategory';
import { AuthRequest } from '../types';

// GET /api/categories
export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await IssueCategory.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    res.json({ success: true, data: { categories } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

// POST /api/categories
export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const category = await IssueCategory.create(req.body);
    res.status(201).json({ success: true, data: { category } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
};

// PUT /api/categories/:id
export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const category = await IssueCategory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }
    res.json({ success: true, data: { category } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update category' });
  }
};

// DELETE /api/categories/:id
export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await IssueCategory.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Category deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
};
