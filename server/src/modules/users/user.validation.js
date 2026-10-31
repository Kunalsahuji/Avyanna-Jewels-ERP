import { z } from 'zod';
import { ROLES } from './user.model.js';

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(ROLES).default('doer'),
  department: z.string().min(1).default('General'),
});

export const updateUserSchema = createUserSchema.partial().extend({ isActive: z.boolean().optional() });
