import mongoose from 'mongoose';
import Info from '../models/info.model.js';
import { NotFoundError, BadRequestError } from '../../utils/customErrors.js';
import logger from '../../utils/logger.js';

class InfoViewController {
  // Record a view for an info document
  recordView = async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        logger.warn(
          `Invalid info document ID format: ${id} for recordView method`
        );
        throw new BadRequestError(
          'Invalid info document ID format for recordView method'
        );
      }

      // Get visitor identifier (IP address or a session ID)
      const visitorIdentifier =
        req.ip || req.headers['x-forwarded-for'] || 'unknown';

      const document = await Info.findById(id);

      if (!document) {
        logger.warn(`Info document not found with ID: ${id}`);
        throw new NotFoundError('Info document not found');
      }

      // Check if this visitor has already viewed the document within the last 24 hours
      const lastDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existingView = document.views.viewers.find(
        (viewer) =>
          viewer.identifier === visitorIdentifier && viewer.timestamp > lastDay
      );

      if (!existingView) {
        // New view or view older than 24 hours, so increment counter and add viewer
        document.views.count += 1;
        document.views.viewers.push({
          identifier: visitorIdentifier,
          timestamp: new Date(),
        });

        // Limit the size of the viewers array to prevent it from growing indefinitely
        // Keep only the most recent 1000 views
        if (document.views.viewers.length > 1000) {
          document.views.viewers = document.views.viewers.slice(-1000);
        }

        await document.save();
        logger.info(
          `Recorded new view for info document ${id} from ${visitorIdentifier}`
        );
      }

      res.status(200).json({
        success: true,
        views: document.views.count,
      });
    } catch (err) {
      logger.error(`Error recording info document view: ${err.message}`);

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

  // Get the most viewed info documents
  getPopularInfoDocuments = async (req, res) => {
    try {
      const { limit = 5, period = 'all' } = req.query;

      let query = { status: 'published' };

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

      const popularDocuments = await Info.find(query)
        .populate('owner', 'username email')
        .sort({ 'views.count': -1 })
        .limit(parseInt(limit));

      logger.info(
        `Retrieved ${popularDocuments.length} popular info documents`
      );

      res.status(200).json({
        success: true,
        count: popularDocuments.length,
        data: popularDocuments,
      });
    } catch (err) {
      logger.error(`Error retrieving popular info documents: ${err.message}`);
      res.status(500).json({
        success: false,
        message: 'Server Error',
      });
    }
  };

  // Get view statistics for a specific info document (admin only)
  getInfoDocumentViewStats = async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        logger.warn(
          `Invalid info document ID format: ${id} for getInfoDocumentViewStats method`
        );
        throw new BadRequestError(
          'Invalid info document ID format for getInfoDocumentViewStats method'
        );
      }

      const document = await Info.findById(id);

      if (!document) {
        logger.warn(`Info document not found with ID: ${id}`);
        throw new NotFoundError('Info document not found');
      }

      // Calculate daily view counts for the past 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Filter views within the last 30 days
      const recentViews = document.views.viewers.filter(
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

      logger.info(`Retrieved view statistics for info document ${id}`);

      res.status(200).json({
        success: true,
        totalViews: document.views.count,
        dailyStats: viewStats,
      });
    } catch (err) {
      logger.error(`Error retrieving info document view stats: ${err.message}`);

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

export default new InfoViewController();
