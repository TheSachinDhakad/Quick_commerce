const jwt = require("jsonwebtoken");
const { responseSent } = require("../Helper/responseSent");

const verifyAuthToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Assumes token is passed as "Bearer <token>"

  if (!token) {
    return responseSent(
      res,
      false,
      403,
      "Token is required for authentication"
    );
  }

  jwt.verify(token, process.env.JWT_SECRET_AUTH, (err, decoded) => {
    if (err) {
      return responseSent(res, false, 401, "Invalid token");
    }

    // Set the decoded data to req.auth
    req.auth = decoded;

    // Proceed to the next middleware or route handler
    next();
  });
};

const loginAuthVerify = async (req, res, next) => {
  try {
    let token = req.headers.authorization;

    if (!token) {
      return responseSent(res, false, 401, "Access denied. No token provided.");
    }

    // Extract token if "Bearer token" format is used
    token = token.replace("Bearer ", "");

    let decoded;
    try {
      // Try to verify with JWT_SECRET (for email-password login)
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      try {
        // Try to verify with JWT_SECRET_AUTH (for OTP login)
        decoded = jwt.verify(token, process.env.JWT_SECRET_AUTH);
      } catch (error) {
        return responseSent(res, false, 401, "Invalid or expired token");
      }
    }
    console.log(decoded);

    req.auth = decoded; // Attach user details to request object
    next();
  } catch (error) {
    return responseSent(res, false, 500, "Token verification failed");
  }
};

module.exports = { verifyAuthToken, loginAuthVerify };
