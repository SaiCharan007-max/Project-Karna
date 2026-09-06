import express from 'express';
import * as fileRetrievalController from '../controllers/fileRetrieval.controller.js';

const router = express.Router();

router.get('/:id', fileRetrievalController.getFileById);

export default router;
