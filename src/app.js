import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import YAML from 'yamljs';
import compression from 'compression';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';
import { corsOptions, helmetOptions, rateLimitOptions } from './utils/securityConfig.js';
import logger from './utils/logger.js';

const swaggerDocument = YAML.load('./swagger.yaml');

const app = express();

app.use(compression());
app.use(helmet(helmetOptions));
app.use(cors(corsOptions));
app.use(rateLimit(rateLimitOptions));
app.use(cookieParser());
app.use(morgan('combined', {
  stream: {
    write: (message) => {
      logger.info(message.trim()); 
    },
  },
})
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;