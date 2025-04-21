import fs from 'fs';
import path from 'path';
import Faculty from '../models/faculty.model.js';
import Department from '../models/department.model.js';
import mongoose from 'mongoose';
import Article from '../models/article.model.js';
import User from '../../model/user.model.js';
import logger from '../../utils/logger.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

class ArticleController {
  getArticles = async (req, res) => {
    try {
      const { q, category, faculty, department } = req.query;
      const query = {};

      // Text search (using MongoDB text index or regex fallback)
      if (q && q.length >= 3) {
        logger.info(`Using regex for search query: ${q}`);
        query.$or = [
          { title: { $regex: q, $options: 'i' } },
          { content: { $regex: q, $options: 'i' } },
          { summary: { $regex: q, $options: 'i' } },
        ];
      }

      // Category filter
      if (category) {
        query.category = category;
      }

      // Faculty filter
      if (faculty) {
        // First, try to find faculty by code
        const facultyDoc = await Faculty.findOne({ code: faculty });
        if (facultyDoc) {
          query.faculty = facultyDoc._id;
        } else if (mongoose.Types.ObjectId.isValid(faculty)) {
          // If not found by code but ID is valid, use the ID directly
          query.faculty = mongoose.Types.ObjectId.createFromHexString(faculty);
        } else {
          logger.warn(`Invalid faculty parameter: ${faculty}`);
          return res.status(400).json({ message: 'Invalid faculty parameter' });
        }
      }

      // Department filter
      if (department) {
        // First, try to find department by code
        const departmentDoc = await Department.findOne({ code: department });
        if (departmentDoc) {
          query.department = departmentDoc._id;
        } else if (mongoose.Types.ObjectId.isValid(department)) {
          // If not found by code but ID is valid, use the ID directly
          query.department =
            mongoose.Types.ObjectId.createFromHexString(department);
        } else {
          logger.warn(`Invalid department parameter: ${department}`);
          return res
            .status(400)
            .json({ message: 'Invalid department parameter' });
        }
      }

      logger.info(
        `Executing article search with query: ${JSON.stringify(query)}`
      );

      const articles = await Article.find(query)
        .populate('department', 'code title')
        .populate('contributors', 'name email')
        .populate('owner', 'username email')
        .populate('faculty', 'code title')
        .sort({ publish_date: -1 });

      logger.info(`Found ${articles.length} articles matching search criteria`);

      res.json(articles);
    } catch (err) {
      logger.error(`Error retrieving articles: ${err.message}`, {
        stack: err.stack,
      });
      res.status(500).send('Server Error');
    }
  };

  getArticleById = async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        logger.warn(
          `Invalid article ID format: ${req.params.id} for getArticleById method`
        );
        return res.status(404).json({ msg: 'Article not found' });
      }

      const article = await Article.findById(req.params.id)
        .populate('department', 'code title')
        .populate('contributors', 'name email bio profile_image')
        .populate('owner', 'username email');

      if (!article) {
        logger.warn(`Article not found with ID: ${req.params.id}`);
        return res.status(404).json({ msg: 'Article not found' });
      }

      // Don't increment the view counter here, as we're handling it separately
      // in the ArticleViewController to avoid double counting

      res.json(article);
    } catch (err) {
      logger.error(
        `Error retrieving article by ID ${req.params.id}: ${err.message}`,
        { stack: err.stack }
      );
      res.status(500).send('Server Error');
    }
  };

  createArticle = async (req, res) => {
    const {
      title,
      category,
      content,
      faculty,
      department,
      contributors,
      summary,
    } = req.body;

    try {
      // Check if faculty exists
      const facultyExists = await Faculty.findOne({ code: faculty });
      if (!facultyExists) {
        logger.warn(`Faculty not found with code: ${faculty}`);
        return res.status(404).json({ msg: 'Faculty not found' });
      }

      // Check if department exists
      const departmentExists = await Department.findOne({ code: department });
      if (!departmentExists) {
        logger.warn(`Department not found with code: ${department}`);
        return res.status(404).json({ msg: 'Department not found' });
      }

      // Verify contributors if provided
      let validContributors = [];
      if (contributors && contributors.length > 0) {
        // Convert string IDs to ObjectIds
        const contributorIds = contributors
          .map((id) =>
            mongoose.Types.ObjectId.isValid(id)
              ? mongoose.Types.ObjectId.createFromHexString(id)
              : null
          )
          .filter((id) => id !== null);

        validContributors = await User.find({
          _id: { $in: contributorIds },
          role: 'researcher',
          isActive: true,
        });

        if (contributorIds.length !== validContributors.length) {
          logger.warn('One or more contributors are invalid');
          return res
            .status(400)
            .json({ msg: 'One or more contributors are invalid' });
        }
      }

      // Create article object
      const article = new Article({
        title,
        category,
        content,
        summary: summary || title.substring(0, 100), // Use provided summary or title truncated
        faculty: facultyExists._id,
        department: departmentExists._id,
        owner: req.user.id,
      });

      // Handle file upload
      article.cover_photo = req.file
        ? `${process.env.API_URL || 'http://localhost:3000'}/uploads/cover_pic/${req.file.filename}`
        : null;

      logger.info(`Cover photo uploaded: ${article.cover_photo}`);

      // Save article first
      await article.save();

      // Add contributors if any
      if (validContributors.length > 0) {
        article.contributors = validContributors.map(
          (contributor) => contributor._id
        );
        logger.info(`Contributors added: ${article.contributors}`);
        await article.save();
      }

      logger.info(`Article created successfully: ${article._id}`);
      res.json(article);
    } catch (err) {
      logger.error(`Error creating article: ${err.message}`);
      res.status(500).send('Server Error');
    }
  };

  getDashboardData = async (req, res) => {
    try {
      const query = req.query.q || '';

      // Get category counts
      const categoryCounts = {
        Research: await Article.countDocuments({ category: 'Research' }),
        Innovation: await Article.countDocuments({ category: 'Innovation' }),
        Development: await Article.countDocuments({ category: 'Development' }),
      };

      // Get recent articles
      let articles = await Article.find()
        .populate('department', 'code title')
        .populate('contributors', 'name')
        .sort({ publish_date: -1 })
        .limit(5);

      if (query) {
        articles = await Article.find({
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { content: { $regex: query, $options: 'i' } },
          ],
        })
          .populate('department', 'code title')
          .populate('contributors', 'name')
          .sort({ publish_date: -1 })
          .limit(5);
      }

      res.json({
        category_counts: categoryCounts,
        recent_articles: articles,
        query,
      });
    } catch (err) {
      logger.error(`Error retrieving dashboard data: ${err.message}`, {
        stack: err.stack,
      });
      res.status(500).send('Server Error');
    }
  };

  // Update article
  updateArticle = async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        logger.warn(
          `Invalid article ID format: ${req.params.id} for updateArticle method`
        );
        return res.status(404).json({ msg: 'Article not found' });
      }

      const article = await Article.findById(req.params.id);
      if (!article) {
        logger.warn(`Article not found with ID: ${req.params.id}`);
        return res.status(404).json({ msg: 'Article not found' });
      }

      // Check ownership or admin status
      if (
        article.owner.toString() !== req.user.id &&
        req.user.role !== 'admin'
      ) {
        logger.warn(
          `Unauthorized article update attempt by user: ${req.user.id}`
        );
        return res.status(401).json({ msg: 'Not authorized' });
      }

      const {
        title,
        category,
        content,
        faculty,
        department,
        contributors,
        summary,
      } = req.body;

      // Check if faculty exists if provided
      if (faculty) {
        const facultyExists = await Faculty.findOne({ code: faculty });
        if (!facultyExists) {
          logger.warn(`Invalid faculty code in update: ${faculty}`);
          return res.status(404).json({ msg: 'Faculty not found' });
        }
        article.faculty = facultyExists._id;
      }

      // Check if department exists if provided
      if (department) {
        const departmentExists = await Department.findOne({ code: department });
        if (!departmentExists) {
          logger.warn(`Invalid department code in update: ${department}`);
          return res.status(404).json({ msg: 'Department not found' });
        }
        article.department = departmentExists._id;
      }

      // Verify contributors if provided
      if (contributors && contributors.length > 0) {
        // Convert string IDs to ObjectIds
        const contributorIds = contributors
          .map((id) =>
            mongoose.Types.ObjectId.isValid(id)
              ? mongoose.Types.ObjectId.createFromHexString(id)
              : null
          )
          .filter((id) => id !== null);

        const validContributors = await User.find({
          _id: { $in: contributorIds },
          role: 'researcher',
          isActive: true,
        });

        if (contributorIds.length !== validContributors.length) {
          logger.warn('One or more contributors are invalid in article update');
          return res
            .status(400)
            .json({ msg: 'One or more contributors are invalid' });
        }

        article.contributors = validContributors.map(
          (contributor) => contributor._id
        );
      }

      // Update article fields
      if (title) article.title = title;
      if (category) article.category = category;
      if (content) article.content = content;
      if (summary) article.summary = summary;
      // Handle file upload
      if (req.file) {
        // Delete previous cover photo if exists
        if (article.cover_photo) {
          const oldFilePath = path.join(
            __dirname,
            '../../',
            article.cover_photo.replace(
              process.env.API_URL || 'http://localhost:3000',
              ''
            )
          );
          try {
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
            }
          } catch (err) {
            logger.error(`Error deleting old cover photo: ${err.message}`);
          }
        }
        article.cover_photo = `${process.env.API_URL || 'http://localhost:3000'}/uploads/cover_pic/${req.file.filename}`;
      }

      await article.save();
      logger.info(`Article updated successfully: ${article._id}`);

      res.json(article);
    } catch (err) {
      logger.error(`Error updating article ${req.params.id}: ${err.message}`, {
        stack: err.stack,
      });
      res.status(500).send('Server Error');
    }
  };

  // Delete article
  deleteArticle = async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        logger.warn(
          `Invalid article ID format: ${req.params.id} for deleteArticle method`
        );
        return res.status(404).json({ msg: 'Article not found' });
      }

      const article = await Article.findById(req.params.id);

      if (!article) {
        logger.warn(`Article not found with ID: ${req.params.id}`);
        return res.status(404).json({ msg: 'Article not found' });
      }

      // Check ownership or admin status
      if (
        article.owner.toString() !== req.user.id &&
        req.user.role !== 'admin'
      ) {
        logger.warn(
          `Unauthorized article deletion attempt by user: ${req.user.id}`
        );
        return res.status(401).json({ msg: 'Not authorized' });
      }

      // Delete cover photo file if exists
      if (article.cover_photo) {
        const filePath = path.join(
          __dirname,
          '../../',
          article.cover_photo.replace(
            process.env.API_URL || 'http://localhost:3000',
            ''
          )
        );
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          logger.error(`Error deleting cover photo: ${err.message}`);
        }
      }

      await Article.findByIdAndRemove(req.params.id);
      logger.info(`Article deleted successfully: ${article._id}`);

      res.json({ msg: 'Article removed' });
    } catch (err) {
      logger.error(`Error deleting article ${req.params.id}: ${err.message}`, {
        stack: err.stack,
      });
      res.status(500).send('Server Error');
    }
  };
}

export default new ArticleController();
