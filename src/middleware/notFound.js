const notFound = (req, res, next) => {
    const error = new Error(`Resource Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    error.isOperational = true;
    next(error);
  };
  
  export default notFound;