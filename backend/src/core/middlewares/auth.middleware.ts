import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../../modules/users/user.model';
import { IRole } from '../../modules/roles/role.model';
import { verifyAccessToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token provided' });
    return;
  }

  try {
    const decoded: any = verifyAccessToken(token);
    
    const user = await User.findById(decoded.id).populate('role').select('-password');
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    if (user.sessionVersion !== decoded.sessionVersion) {
      res.status(401).json({ message: 'Session expired by a newer login' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ message: 'Not authorized, token failed' });
    return;
  }
};

export const authorize = (requiredPermissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    const role = req.user.role as IRole;
    const userPermissions = role.permissions || [];

    // Super admin wildcard
    if (userPermissions.includes('*')) {
      next();
      return;
    }

    const hasPermission = requiredPermissions.some((perm) => userPermissions.includes(perm));
    
    if (!hasPermission) {
      res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    const role = req.user.role as IRole;
    const userPermissions = role.permissions || [];

    // Super admin wildcard gives them access to everything
    if (userPermissions.includes('*')) {
      next();
      return;
    }

    if (allowedRoles.includes(role.name)) {
      next();
      return;
    }

    res.status(403).json({ message: `Forbidden. Requires one of roles: ${allowedRoles.join(', ')}` });
  };
};
