import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { deleteEntry, listCollection, upsertEntry } from './collection.controller.js';

export const collectionRouter = Router({ mergeParams: true });

collectionRouter.get('/:setId', asyncHandler(listCollection));
collectionRouter.put('/:setId/:cardId', asyncHandler(upsertEntry));
collectionRouter.delete('/:setId/:cardId', asyncHandler(deleteEntry));
