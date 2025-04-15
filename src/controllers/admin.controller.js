import crypto from 'crypto';
import User from '../model/user.model.js';
import tokenService from '../services/token.service.js';
import emailService from '../services/email.service.js';
import { BadRequestError, NotFoundError } from '../utils/customErrors.js';
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
    const profilePicture = req.file ? req.file.path : null;

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
      invitationStatus: { $in: ['pending', 'expired', 'accepted'] },
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
}

export default new AdminController();
