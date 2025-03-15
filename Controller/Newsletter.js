const {
  sendNewsLetterConfirmation,
  sendUnsubscribeConfirmation,
} = require("../Helper/nodemailer");
const { responseSent } = require("../Helper/responseSent");
const Newsletter = require("../Models/Newsletter");

// Subscribe user to the newsletter

const defaultRoute = async (req, res) => {
  responseSent(res, true, 200, "Default route for newsletter");
};

const subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return responseSent(
        res,
        false,
        400,
        "Email is required. for newsletter."
      );
    }

    // Check if email is already subscribed
    const existingSubscriber = await Newsletter.findOne({ email });
    let newSubscriber;

    if (existingSubscriber?.isSubscribed) {
      return responseSent(
        res,
        false,
        400,
        "This email is already subscribed to our newsletter."
      );
    }

    if (existingSubscriber) {
      existingSubscriber.isSubscribed = true;
      existingSubscriber.subscribedAt = new Date();
      existingSubscriber.unsubscribedAt = null;
      newSubscriber = existingSubscriber;
    } else {
      newSubscriber = new Newsletter({
        email,
      });
    }

    await newSubscriber.save();

    await sendNewsLetterConfirmation(email, newSubscriber.subscriptionToken);

    responseSent(res, true, 200, "Successfully subscribed to the newsletter.");
  } catch (err) {
    console.error(err);
    responseSent(res, false, 500, "An error occurred while subscribing.");
  }
};

// Unsubscribe user from the newsletter
const unsubscribe = async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return responseSent(
        res,
        false,
        400,
        "Email and token are required to unsubscribe."
      );
    }

    // Find the subscriber by email
    const subscriber = await Newsletter.findOne({
      email,
      subscriptionToken: token,
      isSubscribed: true,
    });
    if (!subscriber) {
      return responseSent(res, false, 404, "Subscriber not found.");
    }

    // Mark the user as unsubscribed
    subscriber.isSubscribed = false;
    subscriber.unsubscribedAt = new Date();

    await subscriber.save();

    await sendUnsubscribeConfirmation(email, token);

    responseSent(
      res,
      true,
      200,
      "Successfully unsubscribed from the newsletter."
    );
  } catch (err) {
    console.error(err);
    responseSent(res, false, 500, "An error occurred while unsubscribing.");
  }
};

const resubscribe = async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return responseSent(
        res,
        false,
        400,
        "Email and token are required to unsubscribe."
      );
    }

    // Find the subscriber by email
    const subscriber = await Newsletter.findOne({
      email,
      subscriptionToken: token,
      isSubscribed: false,
    });
    if (!subscriber) {
      return responseSent(res, false, 404, "Subscriber not found.");
    }

    // Mark the user as unsubscribed
    subscriber.isSubscribed = true;
    subscriber.unsubscribedAt = new Date();

    await subscriber.save();

    await sendNewsLetterConfirmation(email, token);

    responseSent(
      res,
      true,
      200,
      "Successfully resubscribed to the newsletter."
    );
  } catch (err) {
    console.error(err);
    responseSent(res, false, 500, "An error occurred while unsubscribing.");
  }
};

module.exports = {
  defaultRoute,
  subscribe,
  unsubscribe,
  resubscribe,
};
