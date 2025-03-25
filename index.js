require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const morgan = require("morgan");

const Razorpay = require("razorpay");
const crypto = require("crypto");

const app = express();

// Middleware
app.use(bodyParser.json());
// Allow specific origins
const allowedOrigins = [
  "https://e-com-five-amber.vercel.app",
  "https://api.razorpay.com", // Razorpay webhook
  "https://razorpay.com",
  "https://slayyers.niistcse.com",
  "https://slayyers.in",
  "https://bt-claint.vercel.app",
  "https://bt-claint.vercel.app/",
  "http://localhost:3000",

];

if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost:3000");
}

// app.use(cors());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(morgan("tiny"));

// import files
const { connectDB } = require("./Helper/connectDB.js");
const { sendMessage, sendWhatsAppMessage } = require("./Helper/sendSMS.js");
const userRoutes = require("./Routes/User.js");
const categoryRoutes = require("./Routes/Category.js");
const brandRoutes = require("./Routes/Brands.js");
const sellerRoutes = require("./Routes/Seller.js");
const publicRoutes = require("./Routes/Public.js");
const productRoutes = require("./Routes/Product.js");
const addressRoutes = require("./Routes/Address.js");
const enquiryRoutes = require("./Routes/ContactUs.js");
const deliveryPartnerRoutes = require("./Routes/DeliveryPartner.js");
const couponRoutes = require("./Routes/Coupon.js");
const orderRoutes = require("./Routes/Orders.js");
const reviewRoutes = require("./Routes/Review.js");
const newsletterRoutes = require("./Routes/Newsletter.js");

const { responseSent } = require("./Helper/responseSent.js");
const {
  sendVerificationEmail,
  productConfirmation,
} = require("./Helper/nodemailer.js");
const RzOrder = require("./Models/RzOrder.js");
const Order = require("./Models/Order.js");
const User = require("./Models/User.js");

// Connect to MongoDB
connectDB(process.env.MONGO_URI).then(({ success, message }) => {
  console.log(`${message}`);
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Create Order API
app.post(`/api/${process.env.API_VERSION}/create-order`, async (req, res) => {
  try {
    const { userId, orderId, amount, currency } = req.body;
    if (!userId || !orderId || !amount) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    const localOrder = await Order.findById(orderId);
    if (!localOrder)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    const secretKey = crypto.randomBytes(32).toString("hex");
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: currency || "INR",
      receipt: `order_rcpt_${Date.now()}`,
      payment_capture: 1,
    });

    const newOrder = new RzOrder({
      user_id: userId,
      order_id: orderId,
      rz_order_id: order.id,
      amount,
      currency,
      secretKey,
    });

    await newOrder.save();
    localOrder.payment_id = newOrder._id;
    await localOrder.save();

    res.json({ success: true, order, secretKey });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post(`/api/${process.env.API_VERSION}/payment/verify`, async (req, res) => {
  const { orderId, paymentId } = req.body;

  try {
    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(paymentId);

    if (payment.status === "captured") {
      // Update order status to "paid" in the database
      await Order.updateOne(
        { _id: orderId },
        { $set: { "payment_id.status": "paid" } }
      );
      return res.json({ success: true });
    } else if (payment.status === "pending") {
      // Keep payment as "pending" and allow retries
      return res.json({ success: false, message: "Payment still pending" });
    } else {
      return res.json({
        success: false,
        message: "Payment verification failed",
      });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Webhook to Capture Payment
app.post(`/test/payment/webhook`, async (req, res) => {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    console.log("webhook called");

    // Validate Signature
    const generatedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (generatedSignature !== signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    const event = req.body.event;
    const payment = req.body.payload.payment.entity;
    const orderId = payment.order_id;

    // ✅ Find Razorpay Order
    const order = await RzOrder.findOne({ rz_order_id: orderId });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const admin = await User.findOne({ role: "admin" });

    // ✅ Find Local Order & Populate User and Items
    const localOrder = await Order.findById(order.order_id)
      .populate("user_id", "email first_name last_name phone")
      .populate("items.product", "title colors_images")
      .populate(
        "items.product.createdBy",
        "email first_name last_name phone seller_account"
      );

    if (!localOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // ✅ Update Order Status Based on Event
    if (event === "payment.captured") {
      localOrder.status = "paid";
      localOrder.payment_id = order._id;
      order.status = "paid";
      order.paymentId = payment.id;
    } else if (event === "payment.failed") {
      localOrder.status = "cancelled";
      localOrder.payment_id = order._id;
      order.status = "failed";
    }

    await order.save();
    await localOrder.save();

    // ✅ Send Order Confirmation Email & SMS for Successful Payments
    if (event === "payment.captured") {
      let user = localOrder.user_id;
      let email = user.email;
      let phone = user.phone;
      const title = "Order Confirmation - Your Order Has Been Placed!";
      const message =
        "Thank you for shopping with us! Here are your order details:";

      // ✅ Send Email
      await productConfirmation(email, title, message, localOrder);

      const titleAdmin = `New Order Received - Order #${localOrder?.order_id}`;
      const messageAdmin = `A new order has been placed by ${user?.first_name} ${user?.last_name}. Please review the details and start processing the order.`;

      // ✅ Send Email to Admin/Seller
      if (admin) {
        await productConfirmation(
          admin?.email,
          titleAdmin,
          messageAdmin,
          localOrder,
          true
        );
        const adminSmsMessage = `New Order Received! 🚀  
          Order ID: #${localOrder?.order_id}  
          Customer: ${user?.first_name} ${user?.last_name}  
          Amount Paid: ₹${order?.amount}  
          Please review and process the order ASAP.`;

        // ✅ Send SMS to Admin/Seller
        if (admin.phone && adminSmsMessage) {
          // await sendMessage(`+${admin?.phone}`, adminSmsMessage);
        }
      }

      // ✅ Send SMS Notification
      const smsMessage = `Dear ${user?.first_name}, your order #${localOrder?.order_id} is confirmed! 🎉 
      Amount Paid: ₹${order?.amount} 
      Estimated Delivery: in 30-60 min.
      Thank you for shopping with us!`;

      if (phone && smsMessage) {
        await sendMessage(`+${phone}`, smsMessage);
      }

      console.log("✅ Order Confirmation SMS Sent to:", phone);
    }

    console.log("✅ Payment Event Processed:", event);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Check Order Status API
app.get(
  `/api/${process.env.API_VERSION}/order-status/:orderId`,
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const { secretKey } = req.query;

      const order = await RzOrder.findOne({ rz_order_id: orderId, secretKey });
      if (!order)
        return res
          .status(404)
          .json({ success: false, message: "Invalid order or secret key" });

      res.json({
        success: order.status === "paid",
        status: order.status,
        message:
          order.status === "paid"
            ? "Payment successful."
            : "Transaction not completed",
        paymentId: order.paymentId || null,
      });
    } catch (error) {
      console.error("Error fetching order status:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

app.get("/", (req, res) => {
  res.json({ status: true, message: "Welcome to the Binary Threads API" });
});

app.get("/sms", async (req, res) => {
  sendMessage("+917693953346", "This is a test message");
});

app.get("/wt/sms", async (req, res) => {
  const imageUrl =
    "https://niteshbucket.s3.ap-south-1.amazonaws.com/binarythreads/1739090324897-596916.webp";
  const orderDetails = `Order #12345\n👗 Product: Red Dress\n💰 Price: ₹1,499\n🚚 Delivery: 3-5 days`;
  sendWhatsAppMessage("7693953346", orderDetails, imageUrl);
});

app.get("/email", async (req, res) => {
  // Example usage
  const userEmail = "niteshnagar1142002@gmail.com";
  const verificationLink = "email-verify?token=123456";
  let apiRes = await sendVerificationEmail(userEmail, verificationLink);
  res.json({ status: true, message: "Email sent successfully", apiRes });
});

app.use(`/api/${process.env.API_VERSION}/user`, userRoutes);
app.use(`/api/${process.env.API_VERSION}/category`, categoryRoutes);
app.use(`/api/${process.env.API_VERSION}/brand`, brandRoutes);
app.use(`/api/${process.env.API_VERSION}/seller`, sellerRoutes);
app.use(`/api/${process.env.API_VERSION}/public`, publicRoutes);
app.use(`/api/${process.env.API_VERSION}/product`, productRoutes);
app.use(`/api/${process.env.API_VERSION}/address`, addressRoutes);
app.use(`/api/${process.env.API_VERSION}/enquiry`, enquiryRoutes);
app.use(
  `/api/${process.env.API_VERSION}/delivery-partner`,
  deliveryPartnerRoutes
);
app.use(`/api/${process.env.API_VERSION}/coupon`, couponRoutes);
app.use(`/api/${process.env.API_VERSION}/order`, orderRoutes);
app.use(`/api/${process.env.API_VERSION}/review`, reviewRoutes);
app.use(`/api/${process.env.API_VERSION}/newsletter`, newsletterRoutes);

app.get("*", (req, res) => {
  responseSent(res, false, 404, "Route not found.");
});

app.listen(process.env.PORT || 4000, () => {
  console.log(`Server is running on port ${process.env.PORT} 🚀`);
});
