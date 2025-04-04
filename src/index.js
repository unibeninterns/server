import app from './app.js';
import connectDB from './db/database.js';
import logger from './utils/logger.js';
import validateEnv from './utils/validateEnv.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, 'uploads', 'profiles');

// Create directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info(`Upload directory created: ${uploadDir}`);
}

validateEnv();

const PORT = parseInt(process.env.PORT || '3000', 10);

const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      const { port } = server.address();
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();