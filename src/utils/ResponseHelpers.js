export const ServerError = (
    res,
    message,
    status = 500
  ) => {
    return res.status(status).json({ success: false, message });
  };
  
  export const SuccessResponse = (
    res,
    message,
    status = 200,
    data
  ) => {
    return res.status(status).json({ success: true, message, data });
  };