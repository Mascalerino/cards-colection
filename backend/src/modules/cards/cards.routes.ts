import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { listSetCards, listSets } from './cards.controller.js';

export const cardsRouter = Router({ mergeParams: true });

cardsRouter.get('/', asyncHandler(listSets));
cardsRouter.get('/:setId/cards', asyncHandler(listSetCards));
