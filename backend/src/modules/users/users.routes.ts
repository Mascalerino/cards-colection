import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { getUsers, patchUserRole, postUser, removeUser } from './users.controller.js';

export const usersRouter = Router();

usersRouter.get('/', asyncHandler(getUsers));
usersRouter.post('/', asyncHandler(postUser));
usersRouter.patch('/:userId/role', asyncHandler(patchUserRole));
usersRouter.delete('/:userId', asyncHandler(removeUser));
