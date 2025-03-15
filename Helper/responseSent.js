const responseSent = (res, success, statusCode, message = "", data = null) => {
  res.status(statusCode).json({
    res_code: statusCode,
    status: success,
    message: message,
    data: data,
  });
};

const generateOTP = () => {
  const digits = [];

  while (digits.length < 4) {
    const randomDigit = Math.floor(Math.random() * 10); // Generate a digit between 0 and 9
    if (!digits.includes(randomDigit)) {
      digits.push(randomDigit); // Add the digit if it hasn't been used already
    }
  }

  return digits.join("");
};

module.exports = { responseSent, generateOTP };
