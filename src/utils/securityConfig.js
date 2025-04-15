export const corsOptions = {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    optionsSuccessStatus: 200,
    allowedHeaders: ['Content-Type', 'Authorization']
  };
  
  export const helmetOptions = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ['\'self\''],
        scriptSrc: ['\'self\'', '\'unsafe-inline\''],
        styleSrc: ['\'self\'', '\'unsafe-inline\''],
        imgSrc: ['\'self\'', 'data:', 'https:'],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
    frameguard: {
      action: 'deny',
    },
  };
  
  export const rateLimitOptions = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.',
    statusCode: 429,
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
    limit: 100,
    requestPropertyName: 'rateLimit',
  };