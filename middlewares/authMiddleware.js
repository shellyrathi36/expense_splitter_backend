import jwt from "jsonwebtoken";
export const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not Authorized. Please log in again.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;

    if (userId) {
      req.user = { id: userId }; // ✅ Correct
      next();
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please log in again.",
      });
    }
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }
};
// import jwt from "jsonwebtoken";
