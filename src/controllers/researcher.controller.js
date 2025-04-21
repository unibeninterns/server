import mongoose from 'mongoose';
import User from '../model/user.model.js';
import Article from '../Articles/models/article.model.js';
import { NotFoundError, UnauthorizedError } from '../utils/customErrors.js';
import logger from '../utils/logger.js';

class ResearcherProfileController {
  // Get researcher profile with publications and collaborators
  getProfile = async (req, res) => {
    try {
      const userId = req.params.id || req.user.id;

      // Check if viewing another profile while not being admin
      if (
        req.params.id &&
        req.params.id !== req.user.id &&
        req.user.role !== 'admin'
      ) {
        logger.warn(
          `Unauthorized attempt to view researcher profile: ${req.params.id}`
        );
        throw new UnauthorizedError('Not authorized to view this profile');
      }

      const researcher = await User.findById(userId).select(
        '-password -refreshToken -inviteToken'
      );

      if (!researcher || researcher.role !== 'researcher') {
        logger.warn(`Researcher profile not found with ID: ${userId}`);
        throw new NotFoundError('Researcher profile not found');
      }

      // Get researcher's articles
      const articles = await Article.find({
        $or: [{ owner: userId }, { contributors: userId }],
      })
        .populate('department', 'code title')
        .populate('contributors', 'name email')
        .sort({ publish_date: -1 });

      // Get list of collaborators
      const collaboratorIds = new Set();

      articles.forEach((article) => {
        // Add contributors
        article.contributors.forEach((contributor) => {
          if (contributor._id.toString() !== userId) {
            collaboratorIds.add(contributor._id.toString());
          }
        });

        // Add owner if not the researcher
        if (article.owner && article.owner.toString() !== userId) {
          collaboratorIds.add(article.owner.toString());
        }
      });

      // Get collaborator details
      const collaborators = await User.find({
        _id: { $in: Array.from(collaboratorIds) },
      }).select('name email title profilePicture');

      res.status(200).json({
        success: true,
        data: {
          profile: researcher,
          articles: articles,
          collaborators: collaborators,
          stats: {
            total_articles: articles.length,
            sole_author: articles.filter(
              (a) =>
                a.owner.toString() === userId &&
                (!a.contributors || a.contributors.length === 0)
            ).length,
            collaborations: articles.filter(
              (a) =>
                (a.owner.toString() === userId &&
                  a.contributors &&
                  a.contributors.length > 0) ||
                a.owner.toString() !== userId
            ).length,
          },
        },
      });
    } catch (err) {
      logger.error(`Error retrieving researcher profile: ${err.message}`);

      if (err instanceof NotFoundError || err instanceof UnauthorizedError) {
        return res.status(err.statusCode).json({
          success: false,
          message: err.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server Error',
      });
    }
  };

  // Get researcher's most popular articles
  getPopularArticles = async (req, res) => {
    try {
      const userId = req.params.id || req.user.id;

      // Check if viewing another researcher's data while not being admin
      if (
        req.params.id &&
        req.params.id !== req.user.id &&
        req.user.role !== 'admin'
      ) {
        logger.warn(
          `Unauthorized attempt to view researcher's articles: ${req.params.id}`
        );
        throw new UnauthorizedError('Not authorized to view this data');
      }

      const { limit = 5 } = req.query;

      const popularArticles = await Article.find({
        $or: [{ owner: userId }, { contributors: userId }],
      })
        .populate('department', 'code title')
        .populate('contributors', 'name email')
        .sort({ 'views.count': -1 })
        .limit(parseInt(limit));

      logger.info(
        `Retrieved ${popularArticles.length} popular articles for researcher ${userId}`
      );

      res.status(200).json({
        success: true,
        count: popularArticles.length,
        data: popularArticles,
      });
    } catch (err) {
      logger.error(
        `Error retrieving researcher's popular articles: ${err.message}`
      );

      if (err instanceof UnauthorizedError) {
        return res.status(err.statusCode).json({
          success: false,
          message: err.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server Error',
      });
    }
  };

  // Get articles analytics for researcher
  getArticlesAnalytics = async (req, res) => {
    try {
      const userId = req.params.id || req.user.id;

      // Check if viewing another researcher's data while not being admin
      if (
        req.params.id &&
        req.params.id !== req.user.id &&
        req.user.role !== 'admin'
      ) {
        logger.warn(
          `Unauthorized attempt to view researcher's analytics: ${req.params.id}`
        );
        throw new UnauthorizedError('Not authorized to view this data');
      }

      // Get all articles by the researcher
      const articles = await Article.find({
        $or: [{ owner: userId }, { contributors: userId }],
      }).select('title views publish_date');

      // Calculate total views
      const totalViews = articles.reduce(
        (sum, article) => sum + article.views.count,
        0
      );

      // Calculate views by month (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const articlesByMonth = await Article.aggregate([
        {
          $match: {
            $or: [
              { owner: new mongoose.Types.ObjectId(userId) },
              { contributors: new mongoose.Types.ObjectId(userId) },
            ],
            publish_date: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              month: { $month: '$publish_date' },
              year: { $year: '$publish_date' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      // Calculate article categories distribution
      const categoriesDistribution = await Article.aggregate([
        {
          $match: {
            $or: [
              { owner: new mongoose.Types.ObjectId(userId) },
              { contributors: new mongoose.Types.ObjectId(userId) },
            ],
          },
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
      ]);

      logger.info(`Retrieved analytics for researcher ${userId}`);

      res.status(200).json({
        success: true,
        data: {
          totalArticles: articles.length,
          totalViews: totalViews,
          mostViewed:
            articles.sort((a, b) => b.views.count - a.views.count)[0] || null,
          articlesByMonth: articlesByMonth,
          categoriesDistribution: categoriesDistribution,
        },
      });
    } catch (err) {
      logger.error(`Error retrieving researcher's analytics: ${err.message}`);

      if (err instanceof UnauthorizedError) {
        return res.status(err.statusCode).json({
          success: false,
          message: err.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server Error',
      });
    }
  };
}

export default new ResearcherProfileController();
