/**
 * Health check controller
 */
export const getHealthStatus = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Travel Application API is running'
  });
};
