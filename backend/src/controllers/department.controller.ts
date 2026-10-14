import { Request, Response } from 'express';
import { Department } from '../models/Department';
import { User } from '../models/User';
import { AuthRequest } from '../types';

// GET /api/departments
export const getDepartments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('categoryIds', 'name slug')
      .lean();
    res.json({ success: true, data: { departments } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
};

// POST /api/departments
export const createDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dept = await Department.create(req.body);
    res.status(201).json({ success: true, data: { department: dept } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create department' });
  }
};

// PUT /api/departments/:id
export const updateDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!dept) {
      res.status(404).json({ success: false, message: 'Department not found' });
      return;
    }
    res.json({ success: true, data: { department: dept } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update department' });
  }
};

// DELETE /api/departments/:id
export const deleteDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Department.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete department' });
  }
};

// GET /api/departments/:id/officers
export const getDepartmentOfficers = async (req: Request, res: Response): Promise<void> => {
  try {
    const officers = await User.find({ departmentId: req.params.id, isActive: true })
      .select('name email phone role')
      .lean();
    res.json({ success: true, data: { officers } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch officers' });
  }
};
