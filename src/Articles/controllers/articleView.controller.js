import mongoose from 'mongoose';
import Article from '../models/article.model.js';
import { NotFoundError, BadRequestError } from '../../utils/customErrors.js';
import logger from '../../utils/logger.js';

class ArticleViewController {
  // Record a view for an article
  recordView = async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        logger.warn(`Invalid article ID format: ${id} for recordView method`);
        throw new BadRequestError(
          'Invalid article ID format for recordView method'
        );
      }

      // Get visitor identifier (IP address or a session ID)
      const visitorIdentifier =
        req.ip || req.headers['x-forwarded-for'] || 'unknown';

      const article = await Article.findById(id);

      if (!article) {
        logger.warn(`Article not found with ID: ${id}`);
        throw new NotFoundError('Article not found');
      }

      // Check if this visitor has already viewed the article within the last 24 hours
      const lastDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existingView = article.views.viewers.find(
        (viewer) =>
          viewer.identifier === visitorIdentifier && viewer.timestamp > lastDay
      );

      if (!existingView) {
        // New view or view older than 24 hours, so increment counter and add viewer
        article.views.count += 1;
        article.views.viewers.push({
          identifier: visitorIdentifier,
          timestamp: new Date(),
        });

        // Limit the size of the viewers array to prevent it from growing indefinitely
        // Keep only the most recent 1000 views
        if (article.views.viewers.length > 1000) {
          article.views.viewers = article.views.viewers.slice(-1000);
        }

        await article.save();
        logger.info(
          `Recorded new view for article ${id} from ${visitorIdentifier}`
        );
      }

      res.status(200).json({
        success: true,
        views: article.views.count,
      });
    } catch (err) {
      logger.error(`Error recording article view: ${err.message}`);

      if (err instanceof NotFoundError || err instanceof BadRequestError) {
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

  // Get the most viewed articles
  getPopularArticles = async (req, res) => {
    try {
      const { limit = 5, period = 'all' } = req.query;

      let query = {};

      // Filter by time period if specified
      if (period !== 'all') {
        let dateFilter = new Date();

        switch (period) {
          case 'day':
            dateFilter.setDate(dateFilter.getDate() - 1);
            break;
          case 'week':
            dateFilter.setDate(dateFilter.getDate() - 7);
            break;
          case 'month':
            dateFilter.setMonth(dateFilter.getMonth() - 1);
            break;
          case 'year':
            dateFilter.setFullYear(dateFilter.getFullYear() - 1);
            break;
          default:
            // Default to all time
            break;
        }

        if (period !== 'all') {
          query.publish_date = { $gte: dateFilter };
        }
      }

      const popularArticles = await Article.find(query)
        .populate('department', 'code title')
        .populate('contributors', 'name email')
        .populate('owner', 'username email')
        .sort({ 'views.count': -1 })
        .limit(parseInt(limit));

      logger.info(`Retrieved ${popularArticles.length} popular articles`);

      res.status(200).json({
        success: true,
        count: popularArticles.length,
        data: popularArticles,
      });
    } catch (err) {
      logger.error(`Error retrieving popular articles: ${err.message}`);
      res.status(500).json({
        success: false,
        message: 'Server Error',
      });
    }
  };

  // Get view statistics for a specific article (admin and researchers only)
  getArticleViewStats = async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        logger.warn(
          `Invalid article ID format: ${id} for getArticleViewStats method`
        );
        throw new BadRequestError(
          'Invalid article ID format for getArticleViewStats method'
        );
      }

      const article = await Article.findById(id);

      if (!article) {
        logger.warn(`Article not found with ID: ${id}`);
        throw new NotFoundError('Article not found');
      }

      // Calculate daily view counts for the past 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Filter views within the last 30 days
      const recentViews = article.views.viewers.filter(
        (viewer) => viewer.timestamp >= thirtyDaysAgo
      );

      // Group views by date
      const dailyViews = {};

      recentViews.forEach((view) => {
        const dateKey = view.timestamp.toISOString().split('T')[0];
        if (!dailyViews[dateKey]) {
          dailyViews[dateKey] = 0;
        }
        dailyViews[dateKey]++;
      });

      // Convert to array for easier consumption by clients
      const viewStats = Object.entries(dailyViews).map(([date, count]) => ({
        date,
        count,
      }));

      // Sort by date
      viewStats.sort((a, b) => new Date(a.date) - new Date(b.date));

      logger.info(`Retrieved view statistics for article ${id}`);

      res.status(200).json({
        success: true,
        totalViews: article.views.count,
        dailyStats: viewStats,
      });
    } catch (err) {
      logger.error(`Error retrieving article view stats: ${err.message}`);

      if (err instanceof NotFoundError || err instanceof BadRequestError) {
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

export default new ArticleViewController();
