import app from './app.js';
import connectDB from './db/database.js';
import logger from './utils/logger.js';
import validateEnv from './utils/validateEnv.js';

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