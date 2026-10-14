import { Response } from 'express';
import { User } from '../models/User';
import { AuthRequest, UserRole, AuditAction } from '../types';
import { auditFromRequest } from '../services/audit.service';
import { Types } from 'mongoose';

// GET /api/admin/users
export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const { role, search, isActive } = req.query;

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: new RegExp(search as string, 'i') },
        { email: new RegExp(search as string, 'i') },
        { phone: new RegExp(search as string, 'i') },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('departmentId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// POST /api/admin/users
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password, role, departmentId } = req.body;

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      res.status(400).json({ success: false, message: 'Email already exists' });
      return;
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role,
      departmentId: departmentId ? new Types.ObjectId(departmentId) : undefined,
      createdBy: new Types.ObjectId(req.user!.userId),
      isVerified: true,
    });

    await auditFromRequest(req, AuditAction.USER_CREATED, 'User', user._id, { email, role });

    res.status(201).json({ success: true, data: { user } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
};

// PATCH /api/admin/users/:id
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, role, departmentId, isActive, jurisdictions } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, role, departmentId, isActive, jurisdictions },
      { new: true, runValidators: true }
    );
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    await auditFromRequest(req, AuditAction.USER_UPDATED, 'User', user._id, req.body);
    res.json({ success: true, data: { user } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

// DELETE /api/admin/users/:id (soft delete)
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, isActive: false },
      { new: true }
    );
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    await auditFromRequest(req, AuditAction.USER_DELETED, 'User', user._id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};
