import { Response } from 'express';
import { getAllUsers, updateUserStatus, findUserById } from '../../db/index.js';
import { AuthenticatedRequest, UserStatus } from '../../types/auth.js';

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { search, role, status } = req.query;

    const users = await getAllUsers({
      search: search ? (search as string) : undefined,
      role: role ? (role as string) : undefined,
      status: status ? (status as string) : undefined,
    });

    return res.json({ users });
  } catch (err: any) {
    console.error('Get users error:', err);
    return res.status(500).json({ message: 'Failed to fetch users.' });
  }
};

export const updateStatus = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'disabled'].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'active' or 'disabled'." });
    }

    const targetStatus = status as UserStatus;

    if (req.user?.id === id && targetStatus === 'disabled') {
      return res.status(400).json({ message: 'You cannot disable your own account.' });
    }

    const existingUser = await findUserById(id as string);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const updatedUser = await updateUserStatus(id as string, targetStatus);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({
      message: `User status updated to '${targetStatus}' successfully.`,
      user: updatedUser,
    });
  } catch (err: any) {
    console.error('Update user status error:', err);
    return res.status(500).json({ message: 'Failed to update user status.' });
  }
};
