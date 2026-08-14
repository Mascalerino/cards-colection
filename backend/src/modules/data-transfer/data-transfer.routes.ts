import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { exportData, importData } from './data-transfer.controller.js';

export const dataTransferRouter = Router();

dataTransferRouter.get('/export', asyncHandler(exportData));
dataTransferRouter.post('/import', asyncHandler(importData));
