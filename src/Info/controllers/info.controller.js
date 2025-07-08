import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Info from '../models/info.model.js';
import User from '../../model/user.model.js';
import logger from '../../utils/logger.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

class InfoController {
  getInfoDocuments = async (req, res) => {
    try {
      const {
        q,
        page = 1,
        limit = 10,
        sort = 'publish_date',
        order = 'desc',
      } = req.query;
      const query = { status: 'published' };

      // Text search
      if (q && q.length >= 2) {
        logger.info(`Using regex for search query: ${q}`);
        query.$or = [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
        ];
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortOrder = order === 'desc' ? -1 : 1;
      const sortObj = {};
      sortObj[sort] = sortOrder;

      logger.info(
        `Executing info documents search with query: ${JSON.stringify(query)}`
      );

      const [documents, totalCount] = await Promise.all([
        Info.find(query)
          .populate('owner', 'username email')
          .sort(sortObj)
          .skip(skip)
          .limit(parseInt(limit)),
        Info.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      logger.info(
        `Found ${documents.length} info documents matching search criteria`
      );

      res.json({
        documents,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1,
        },
      });
    } catch (err) {
      logger.error(`Error retrieving info documents: ${err.message}`, {
        stack: err.stack,
      });
      res.status(500).send('Server Error');
    }
  };

  getInfoDocumentById = async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        logger.warn(
          `Invalid info document ID format: ${req.params.id} for getInfoDocumentById method`
        );
        return res.status(404).json({ msg: 'Info document not found' });
      }

      const document = await Info.findById(req.params.id).populate(
        'owner',
        'username email'
      );

      if (!document) {
        logger.warn(`Info document not found with ID: ${req.params.id}`);
        return res.status(404).json({ msg: 'Info document not found' });
      }

      res.json(document);
    } catch (err) {
      logger.error(
        `Error retrieving info document by ID ${req.params.id}: ${err.message}`,
        {
          stack: err.stack,
        }
      );
      res.status(500).send('Server Error');
    }
  };

  createInfoDocument = async (req, res) => {
    const { title, description } = req.body;

    try {
      if (!req.file) {
        logger.warn('No file uploaded for info document creation');
        return res.status(400).json({ msg: 'Document file is required' });
      }

      // Get file extension and create new filename based on title
      const fileExtension = path.extname(req.file.originalname);
      const sanitizedTitle = title
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '_');
      const newFilename = `${sanitizedTitle}_${Date.now()}${fileExtension}`;
      const oldPath = req.file.path;
      const newPath = path.join(path.dirname(oldPath), newFilename);

      // Rename the file
      fs.renameSync(oldPath, newPath);

      // Create info document object
      const document = new Info({
        title,
        description: description || '',
        info_doc: `${process.env.API_URL || 'http://localhost:3000'}/uploads/info_docs/${newFilename}`,
        original_filename: req.file.originalname,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        owner: req.user.id,
      });

      await document.save();

      logger.info(`Info document created successfully: ${document._id}`);
      res.json(document);
    } catch (err) {
      logger.error(`Error creating info document: ${err.message}`);
      res.status(500).send('Server Error');
    }
  };

  deleteInfoDocument = async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        logger.warn(
          `Invalid info document ID format: ${req.params.id} for deleteInfoDocument method`
        );
        return res.status(404).json({ msg: 'Info document not found' });
      }

      const document = await Info.findById(req.params.id);

      if (!document) {
        logger.warn(`Info document not found with ID: ${req.params.id}`);
        return res.status(404).json({ msg: 'Info document not found' });
      }

      // Check if user is admin
      if (req.user.role !== 'admin') {
        logger.warn(
          `Unauthorized info document deletion attempt by user: ${req.user.id}`
        );
        return res.status(401).json({ msg: 'Not authorized' });
      }

      // Delete document file if exists
      if (document.info_doc) {
        const filePath = path.join(
          __dirname,
          '../../',
          document.info_doc.replace(
            process.env.API_URL || 'http://localhost:3000',
            ''
          )
        );
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          logger.error(`Error deleting info document file: ${err.message}`);
        }
      }

      await Info.findByIdAndRemove(req.params.id);
      logger.info(`Info document deleted successfully: ${document._id}`);

      res.json({ msg: 'Info document removed' });
    } catch (err) {
      logger.error(
        `Error deleting info document ${req.params.id}: ${err.message}`,
        {
          stack: err.stack,
        }
      );
      res.status(500).send('Server Error');
    }
  };
}

export default new InfoController();
