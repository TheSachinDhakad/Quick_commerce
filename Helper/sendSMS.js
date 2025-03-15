const twilio = require("twilio");

// Get credentials from .env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

const client = new twilio(accountSid, authToken);

const sendMessage = async (to, messageBody) => {
  try {
    const message = await client.messages.create({
      body: messageBody,
      from: twilioPhone,
      to: to, // Recipient's phone number
    });

    console.log(`${to}: ${message.sid} => ${messageBody}`);

    return true;
  } catch (error) {
    console.error("Error sending message:", error);
    return false;
  }
};

// Function to send order details via WhatsApp
const sendWhatsAppMessage = async (to, orderDetails, imageUrl) => {
  try {
    const message = await client.messages.create({
      from: `whatsapp:${twilioPhone}`, // Twilio Sandbox WhatsApp number
      to: `whatsapp:+${to}`, // Customer's WhatsApp number
      body: `🛍️ Your Order Details:\n\n${orderDetails}\n\nThank you for shopping with us!`,
      mediaUrl: imageUrl ? [imageUrl] : [],
    });

    console.log("Message Sent:", message.sid);
  } catch (error) {
    console.error("Error sending message:", error.message);
  }
};

module.exports = { sendMessage, sendWhatsAppMessage };
