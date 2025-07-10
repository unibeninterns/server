import app from './app.js';
import connectDB from './db/database.js';
import logger from './utils/logger.js';
import validateEnv from './utils/validateEnv.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createAdminUser } from './scripts/createAdmin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');
const profileUploadDir = path.join(uploadsDir, 'profiles');
const coverPicUploadDir = path.join(uploadsDir, 'cover_pic');
const infoDocUploadDir = path.join(uploadsDir, 'info_docs');

// Create directories if they don't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info(`Uploads directory created: ${uploadsDir}`);
}

[profileUploadDir, coverPicUploadDir, infoDocUploadDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Directory created: ${dir}`);
  }
});

validateEnv();

const PORT = parseInt(process.env.PORT || '3000', 10);

const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      const { port } = server.address();
      logger.info(
        `Server running in ${process.env.NODE_ENV} mode on port ${port}`
      );
      createAdminUser();
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
