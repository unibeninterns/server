const asyncHandler = (execution) => {
    return (req, res, next) => {
      execution(req, res, next).catch(next);
    };
  };
  
  export default asyncHandler;