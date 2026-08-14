import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { createSetSale, deleteSetSale, listSetSales } from './sales.controller.js';

export const salesRouter = Router();

salesRouter.get('/:setId', asyncHandler(listSetSales));
salesRouter.post('/', asyncHandler(createSetSale));
salesRouter.delete('/:saleId', asyncHandler(deleteSetSale));
