import crypto from 'crypto';
import User from '../model/user.model.js';
import emailService from '../services/email.service.js';
import { BadRequestError, NotFoundError } from '../utils/customErrors.js';
import Article from '../Articles/models/article.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';
import generateSecurePassword from '../utils/passwordGenerator.js';

class AdminController {
  // Invite a researcher by email
  inviteResearcher = asyncHandler(async (req, res) => {
    const { email } = req.body;

    logger.info(`Invitation request received for email: ${email}`);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn(`Attempt to invite already registered email: ${email}`);
      throw new BadRequestError('Email already registered');
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(inviteToken)
      .digest('hex');

    // Store invitation
    const invitation = {
      email,
      inviteToken: hashedToken,
      inviteTokenExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      invitationStatus: 'pending',
    };

    // Save invitation to database
    await User.create({
      email,
      inviteToken: hashedToken,
      inviteTokenExpires: invitation.inviteTokenExpires,
      role: 'researcher',
      invitationStatus: 'pending',
      isActive: false,
    });

    logger.info(`Created invitation record for email: ${email}`);

    // Send invitation email
    await emailService.sendInvitationEmail(email, inviteToken);
    logger.info(`Invitation email sent to: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Invitation sent successfully',
    });
  });

  // Add a researcher profile manually (without invitation)
  addResearcherProfile = asyncHandler(async (req, res) => {
    const { email, name, faculty, bio, title } = req.body;
    const profilePicture = req.file
      ? `http://localhost:3000/uploads/profiles/${req.file.filename}`
      : null;

    logger.info(
      `Manual researcher profile creation request for email: ${email}`
    );

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn(
        `Attempt to create profile for already registered email: ${email}`
      );
      throw new BadRequestError('Email already registered');
    }

    // Generate a random password for the user
    const generatedPassword = generateSecurePassword();

    // Create new researcher profile
    const newUser = await User.create({
      email,
      name,
      faculty,
      bio,
      title,
      profilePicture,
      password: generatedPassword,
      role: 'researcher',
      isActive: true,
      invitationStatus: 'added',
    });

    logger.info(`Researcher profile manually created for: ${email}`);

    // Send login credentials to the researcher
    await emailService.sendCredentialsEmail(email, generatedPassword);
    logger.info(`Login credentials sent to: ${email}`);

    res.status(201).json({
      success: true,
      message:
        'Researcher profile created successfully. Login credentials have been sent to their email.',
      data: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        faculty: newUser.faculty,
        title: newUser.title,
      },
    });
  });

  // Delete a researcher profile
  deleteResearcher = asyncHandler(async (req, res) => {
    const { id } = req.params;

    logger.info(`Researcher deletion request for ID: ${id}`);

    const researcher = await User.findById(id);

    if (!researcher) {
      logger.warn(`Attempt to delete non-existent researcher with ID: ${id}`);
      throw new NotFoundError('Researcher not found');
    }

    if (researcher.role !== 'researcher') {
      logger.warn(`Attempt to delete non-researcher account with ID: ${id}`);
      throw new BadRequestError('Can only delete researcher accounts');
    }

    await User.findByIdAndDelete(id);
    logger.info(`Researcher profile deleted for: ${researcher.email}`);

    res.status(200).json({
      success: true,
      message: 'Researcher profile deleted successfully',
    });
  });

  // Get all researchers
  getResearchers = asyncHandler(async (req, res) => {
    const researchers = await User.find({
      role: 'researcher',
      isActive: true,
    }).select(
      '_id name email faculty title profilePicture createdAt lastLogin'
    );

    res.status(200).json({
      success: true,
      data: researchers,
    });
  });

  // Get all invitations
  getInvitations = asyncHandler(async (req, res) => {
    await User.updateMany(
      {
        role: 'researcher',
        invitationStatus: 'pending',
        inviteTokenExpires: { $lt: new Date() },
      },
      { invitationStatus: 'expired' }
    );

    const invitations = await User.find({
      role: 'researcher',
      invitationStatus: { $in: ['pending', 'expired', 'accepted', 'added'] },
    }).select('_id email inviteTokenExpires createdAt invitationStatus');

    const formattedInvitations = invitations.map((invitation) => ({
      id: invitation._id,
      email: invitation.email,
      status: invitation.invitationStatus,
      created: invitation.createdAt.toISOString().split('T')[0],
      expires: invitation.inviteTokenExpires
        ? invitation.inviteTokenExpires.toISOString().split('T')[0]
        : null,
    }));

    res.status(200).json({
      success: true,
      data: formattedInvitations,
    });
  });

  // Resend invitation
  resendInvitation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user || user.role !== 'researcher' || !user.inviteToken) {
      throw new NotFoundError('Invitation not found');
    }

    // Generate new invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(inviteToken)
      .digest('hex');

    // Update invitation
    user.inviteToken = hashedToken;
    user.inviteTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    user.invitationStatus = 'pending';
    await user.save();

    logger.info(`Invitation resent for email: ${user.email}`);

    // Send invitation email
    await emailService.sendInvitationEmail(user.email, inviteToken);

    res.status(200).json({
      success: true,
      message: 'Invitation resent successfully',
    });
  });

  // Delete invitation
  deleteInvitation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('Invitation not found');
    }

    await User.findByIdAndDelete(id);
    logger.info(`Invitation deleted for email: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Invitation deleted successfully',
    });
  });

  // Get researcher dashboard data for admin
  getResearcherDashboard = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError('Researcher ID is required');
    }

    logger.info(`Admin requesting dashboard for researcher ID: ${id}`);

    // Verify the researcher exists
    const researcher = await User.findById(id);
    if (!researcher || researcher.role !== 'researcher') {
      logger.warn(`Researcher not found with ID: ${id}`);
      throw new NotFoundError('Researcher not found');
    }

    // Get researcher's articles
    const articles = await Article.find({
      $or: [{ owner: id }, { contributors: id }],
    })
      .populate('department', 'code title')
      .populate('contributors', 'name email')
      .sort({ publish_date: -1 });

    // Get list of collaborators
    const collaboratorIds = new Set();

    articles.forEach((article) => {
      // Add contributors
      article.contributors.forEach((contributor) => {
        if (contributor._id.toString() !== id) {
          collaboratorIds.add(contributor._id.toString());
        }
      });

      // Add owner if not the researcher
      if (article.owner && article.owner.toString() !== id) {
        collaboratorIds.add(article.owner.toString());
      }
    });

    // Get collaborator details
    const collaborators = await User.find({
      _id: { $in: Array.from(collaboratorIds) },
    }).select('name email title profilePicture');

    // Get popular articles
    const popularArticles = articles
      .sort((a, b) => (b.views?.count || 0) - (a.views?.count || 0))
      .slice(0, 5);

    // Calculate category distribution
    const categoriesMap = {};
    articles.forEach((article) => {
      if (!categoriesMap[article.category]) {
        categoriesMap[article.category] = { _id: article.category, count: 0 };
      }
      categoriesMap[article.category].count += 1;
    });
    const categoriesDistribution = Object.values(categoriesMap);

    // Calculate total views
    const totalViews = articles.reduce(
      (sum, article) => sum + (article.views?.count || 0),
      0
    );

    logger.info(`Successfully retrieved dashboard data for researcher ${id}`);

    res.status(200).json({
      success: true,
      data: {
        profile: {
          _id: researcher._id,
          name: researcher.name,
          email: researcher.email,
          title: researcher.title,
          faculty: researcher.faculty,
          profilePicture: researcher.profilePicture,
        },
        articles: articles,
        collaborators: collaborators,
        stats: {
          total_articles: articles.length,
          sole_author: articles.filter(
            (a) =>
              a.owner.toString() === id &&
              (!a.contributors || a.contributors.length === 0)
          ).length,
          collaborations: articles.filter(
            (a) =>
              (a.owner.toString() === id &&
                a.contributors &&
                a.contributors.length > 0) ||
              a.owner.toString() !== id
          ).length,
        },
        analytics: {
          totalArticles: articles.length,
          totalViews: totalViews,
          categoriesDistribution: categoriesDistribution,
        },
      },
    });
  });
}

export default new AdminController();
