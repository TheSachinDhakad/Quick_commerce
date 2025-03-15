const Order = require("../Models/Order.js");
const Coupon = require("../Models/Coupon.js");
const { responseSent } = require("../Helper/responseSent.js");
const User = require("../Models/User.js");
const DeliveryPartner = require("../Models/DeliveryPartner.js");
const { productConfirmation } = require("../Helper/nodemailer.js");
const { sendMessage } = require("../Helper/sendSMS.js");
const Notifications = require("../Models/Notifications.js");

const defaultRoute = async (req, res) => {
  responseSent(res, true, 200, "Default route for orders");
};

const createOrder = async (req, res) => {
  try {
    const { userId } = req.auth; // Extract user ID from authentication
    const { items, couponCode, paymentMethod, address } = req.body;

    // Validate order items
    if (!Array.isArray(items) || items.length === 0) {
      return responseSent(
        res,
        false,
        400,
        "Order must contain at least one item."
      );
    }

    // Validate address
    if (!address || !address.address || !address.lat || !address.lng) {
      return responseSent(res, false, 400, "Valid address is required.");
    }

    if (typeof address.lat !== "number" || typeof address.lng !== "number") {
      return responseSent(
        res,
        false,
        400,
        "Latitude and longitude must be numbers."
      );
    }

    // Validate payment method
    const validPaymentMethods = ["cod", "online", "try-buy"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return responseSent(res, false, 400, "Invalid payment method.");
    }

    if (paymentMethod === "try-buy" && couponCode) {
      return responseSent(
        res,
        false,
        400,
        "Coupon code is not allowed with try-buy payment method."
      );
    }

    // Calculate total price
    let totalPrice = items.reduce((acc, item) => {
      if (!item.product || !item.quantity || !item.price) {
        return responseSent(res, false, 400, "Invalid order items.");
      }
      return acc + item.price * item.quantity;
    }, 0);

    // Apply GST (18% of totalPrice)
    const gstAmount = parseFloat((totalPrice * 0.18).toFixed(2));

    let discountAmount = 0;
    let couponId = null;

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode,
        is_deleted: false,
      });

      if (!coupon || !coupon.canUse()) {
        return responseSent(res, false, 400, "Invalid or expired coupon.");
      }

      discountAmount = parseFloat(
        ((totalPrice * coupon.discount) / 100).toFixed(2)
      );
      couponId = coupon._id;

      // Use Promise.all to update coupon usage
      await Promise.all([coupon.incrementUsage()]);
    }

    // Calculate final amount after GST and discount
    let finalAmount = parseFloat(
      (totalPrice + gstAmount - discountAmount).toFixed(2)
    );
    if (finalAmount < 0) finalAmount = 0; // Ensure finalAmount is never negative

    let pendingOrders = await Order.find({
      user_id: userId,
      status: "pending",
    });

    if (pendingOrders.length >= 6) {
      return responseSent(
        res,
        false,
        400,
        "You have reached the maximum number of pending orders."
      );
    }

    // Create order
    const newOrder = new Order({
      user_id: userId,
      order_id: Math.floor(10000000 + Math.random() * 90000000).toString(),
      items,
      coupon: couponId,
      totalPrice,
      gstAmount,
      discountAmount,
      finalAmount,
      paymentMethod,
      status: "pending",
      group_order: items.length > 1,
      address,
    });

    // Save order
    await newOrder.save();

    let user = await User.findByIdAndUpdate(userId, {
      cart: [],
    });

    let processOrder = await Order.findById(newOrder._id)
      .populate("user_id", "email first_name last_name phone")
      .populate("items.product", "title colors_images createdBy")
      .populate(
        "items.product.createdBy",
        "email first_name last_name phone seller_account"
      );

    let admin = await User.findOne({ role: "admin" });

    if (paymentMethod !== "online") {
      // Send order confirmation email
      const title = "Order Confirmation - Your Order Has Been Placed!";
      const message =
        "Thank you for shopping with us! Here are your order details:";
      await productConfirmation(user?.email, title, message, processOrder);

      let textMessage = `Order ID: #${processOrder?.order_id}  
        Customer: ${user?.first_name} ${user?.last_name}  
        Amount Paid: ₹${processOrder?.finalAmount}  
        Payment Method: ${processOrder?.paymentMethod}  
        Your order has been placed successfully.`;
      await sendMessage(`+${user?.phone}`, textMessage);

      if (admin) {
        let adminTextMessage = `Order ID: #${processOrder?.order_id}  
          Customer: ${user?.first_name} ${user?.last_name}  
          Amount Pending: ₹${processOrder?.finalAmount}  
          Payment Method: ${processOrder?.paymentMethod}  
          A new order has been placed by ${user?.first_name} ${user?.last_name}. Please review the details and start processing the order.`;
        await sendMessage(`+${admin?.phone}`, adminTextMessage);

        let adminTitle = `New Order Received - Order #${processOrder?.order_id}`;
        let adminMessage = `A new order has been placed by ${user?.first_name} ${user?.last_name}. Please review the details and start processing the order.`;
        await productConfirmation(
          admin?.email,
          adminTitle,
          adminMessage,
          processOrder,
          true
        );
      }

      // Extract unique sellers
      const uniqueSellers = new Map();

      for (const item of processOrder.items) {
        const sellerEmail = item?.product?.createdBy?.email;
        const sellerPhone = item?.product?.createdBy?.phone;

        if (sellerEmail) {
          uniqueSellers.set(sellerEmail, {
            email: sellerEmail,
            phone: sellerPhone,
          });
        }
      }

      // Send notifications to unique sellers
      for (const seller of uniqueSellers.values()) {
        let sellerTitle = `New Order Received - Order #${processOrder?.order_id}`;
        let sellerMessage = `A new order has been placed by ${user?.first_name} ${user?.last_name}. Please review the details and start processing the order.`;

        console.log("📧 Sending email to seller:", seller.email);
        await productConfirmation(
          seller.email,
          sellerTitle,
          sellerMessage,
          processOrder,
          true
        );

        if (seller.phone) {
          let sellerTextMessage = `Order ID: #${processOrder?.order_id}  
            Customer: ${user?.first_name} ${user?.last_name}  
            Amount Paid: ₹${processOrder?.finalAmount}  
            Payment Method: ${processOrder?.paymentMethod}  
            A new order has been placed. Please review and process.`;

          console.log("📲 Sending SMS to seller:", seller.phone);
          // await sendMessage(`+${seller.phone}`, sellerTextMessage);
        }
      }
    }

    return responseSent(res, true, 201, "Order placed successfully", {
      order: newOrder,
    });
  } catch (error) {
    console.error(error);
    return responseSent(res, false, 500, "Server error, try again later");
  }
};

const deliverTryBuyItems = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { orderId, userPick } = req.body;

    // Validate input
    if (!orderId || !Array.isArray(userPick)) {
      return responseSent(
        res,
        false,
        400,
        "Order ID and selected items are required."
      );
    }

    // Fetch the order
    const order = await Order.findOne({
      order_id: orderId,
      paymentMethod: "try-buy",
    });

    if (!order) {
      return responseSent(
        res,
        false,
        404,
        "Order not found or not eligible for try-buy delivery."
      );
    }

    // Move all items to final_items
    order.final_items = [...order.items];

    // Filter userPick items to keep in items
    order.items = order.items.filter((i) =>
      userPick.includes(i._id.toString())
    );

    let totalPrice = 0;
    order.items.forEach((item) => {
      totalPrice += item.price * item.quantity;
    });

    // Apply GST (18% of totalPrice)
    const gstAmount = parseFloat((totalPrice * 0.18).toFixed(2));
    const finalAmount = parseFloat((totalPrice + gstAmount).toFixed(2));

    // Update amounts
    order.totalPrice = totalPrice;
    order.gstAmount = gstAmount;
    order.finalAmount = finalAmount;
    order.status = "delivered";

    // Mark modified fields
    order.markModified("final_items");
    order.markModified("items");

    await order.save();

    return responseSent(
      res,
      true,
      200,
      "Try-buy items delivered successfully.",
      {
        order,
      }
    );
  } catch (error) {
    console.error(error);
    return responseSent(res, false, 500, "Server error, try again later");
  }
};

const estimateTryBuyCost = async (req, res) => {
  try {
    const { orderId, userPick } = req.body;

    // Validate input
    if (!orderId || !Array.isArray(userPick) || userPick.length === 0) {
      return responseSent(
        res,
        false,
        400,
        "Order ID and selected items are required."
      );
    }

    // Fetch the order with populated fields
    const order = await Order.findOne({
      order_id: orderId,
      paymentMethod: "try-buy",
    })
      .populate({
        path: "items.product",
        select: "colors_images title final_price",
      })
      .populate({
        path: "user_id",
        select: "first_name last_name email phone",
      });

    if (!order) {
      return responseSent(
        res,
        false,
        404,
        "Order not found or not eligible for try-buy."
      );
    }

    let totalPrice = 0;
    const selectedItems = [];

    for (const itemId of userPick) {
      const item = order.items.find((i) => i._id.toString() === itemId);
      if (!item) {
        return responseSent(res, false, 400, `Invalid item ID: ${itemId}`);
      }
      totalPrice += item.price * item.quantity;
      selectedItems.push(item);
    }

    // Apply GST (18% of totalPrice)
    const gstAmount = parseFloat((totalPrice * 0.18).toFixed(2));
    let finalAmount = parseFloat((totalPrice + gstAmount).toFixed(2));

    // Create a new object with merged data
    const updatedOrder = {
      ...order.toObject(), // Convert Mongoose document to plain object
      items: selectedItems,
      totalPrice,
      gstAmount,
      finalAmount,
    };

    return responseSent(
      res,
      true,
      200,
      "Estimated cost calculated successfully.",
      { order: updatedOrder }
    );
  } catch (error) {
    console.error(error);
    return responseSent(res, false, 500, "Server error, try again later");
  }
};

// ✅ Get user orders
const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.auth;

    const orders = await Order.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "items.product final_items.product",
        select: "colors_images title final_price",
      })
      .populate({
        path: "user_id",
        select: "first_name last_name email phone",
      })
      .populate("delivery_partner payment_id review_id");

    return responseSent(res, true, 200, "User orders fetched successfully", {
      orders,
    });
  } catch (error) {
    console.error(error);
    return responseSent(res, false, 500, "Server error, try again later");
  }
};

// ✅ Get all orders (Admin Only) with Pagination & Filtering
const getAllOrders = async (req, res) => {
  try {
    const { role } = req.auth;
    if (role !== "admin") {
      return responseSent(
        res,
        false,
        403,
        "Unauthorized: Admin access required"
      );
    }

    let { status, page = 1, limit = 10, all, search } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};

    // Filter by order status
    if (status) {
      filter.status = status;
    }

    // Search by order ID or user name
    if (search) {
      filter.$or = [
        { "user_id.first_name": { $regex: search, $options: "i" } }, // Search by user first name
        { "user_id.last_name": { $regex: search, $options: "i" } }, // Search by user last name
        { "user_id.email": { $regex: search, $options: "i" } }, // Search by user email
        { "user_id.phone": { $regex: search, $options: "i" } }, // Search by user phone
        { "address.address": { $regex: search, $options: "i" } }, // Search by address
        { order_id: { $regex: search, $options: "i" } }, // Search by order ID
      ];
    }

    let query = Order.find(filter)
      .populate({ path: "user_id", select: "first_name last_name email phone" }) // Populating user details
      .populate({
        path: "items.product final_items.product",
        select: "colors_images title final_price",
      })
      .populate("coupon delivery_partner payment_id review_id")
      .sort({ createdAt: -1 }); // Sort by latest orders

    // If "all" is not true, apply pagination
    if (!all || all === "false") {
      query = query.skip((page - 1) * limit).limit(limit);
    }

    // Get total count of filtered orders
    const totalRecords = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    const orders = await query.exec();

    return responseSent(res, true, 200, "All orders fetched successfully", {
      orders,
      page,
      limit,
      totalPages,
      totalRecords,
    });
  } catch (error) {
    console.error(error);
    return responseSent(res, false, 500, "Server error, try again later");
  }
};

/**
 * Controller to get a list of all orders belonging to a seller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getAllSellerOrders = async (req, res) => {
  try {
    const { role, userId } = req.auth; // Get logged-in seller's ID

    if (role !== "seller") {
      return responseSent(
        res,
        false,
        403,
        "Unauthorized: Seller access required"
      );
    }

    let { status, page = 1, limit = 10, all, search } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // Construct filter for seller orders
    const filter = {
      "items.product": { $exists: true }, // Ensure products exist
    };

    // Filter by order status
    if (status) {
      filter.status = status;
    }

    // Search by order ID or user details
    if (search) {
      filter.$or = [
        { "user_id.first_name": { $regex: search, $options: "i" } },
        { "user_id.last_name": { $regex: search, $options: "i" } },
        { "user_id.email": { $regex: search, $options: "i" } },
        { "user_id.phone": { $regex: search, $options: "i" } },
        { "address.address": { $regex: search, $options: "i" } },
        { order_id: { $regex: search, $options: "i" } },
      ];
    }

    console.log(filter);

    // Find only orders where at least one product belongs to the logged-in seller
    let query = Order.find(filter)
      .populate({ path: "user_id", select: "first_name last_name email phone" })
      .populate({
        path: "items.product",
        select: "colors_images title final_price createdBy",
      })
      .populate("coupon delivery_partner payment_id review_id")
      .sort({ createdAt: -1 });

    // Apply pagination if "all" is not set to true
    if (!all || all === "false") {
      query = query.skip((page - 1) * limit).limit(limit);
    }

    // Execute the query
    const orders = await query.exec();

    // Process orders: Keep only the seller's items & add "group_order" flag
    const processedOrders = orders
      .map((order) => {
        // Filter only items created by the logged-in seller
        const sellerItems = order.items.filter(
          (item) => item.product && item.product.createdBy.toString() === userId
        );

        // If no items belong to the seller, skip this order
        if (sellerItems.length === 0) return null;

        return {
          ...order.toObject(), // Convert Mongoose document to plain object
          items: sellerItems, // Include only seller's items
          group_order: !sellerItems.length === 1, // If at least one item exists, mark as "group_order: true"
        };
      })
      .filter(Boolean); // Remove null values (orders without seller's items)

    // Get total records count after filtering
    const totalRecords = processedOrders.length;
    const totalPages = Math.ceil(totalRecords / limit);

    return responseSent(res, true, 200, "Seller orders fetched successfully", {
      orders: processedOrders,
      page,
      limit,
      totalPages,
      totalRecords,
    });
  } catch (error) {
    console.error(error);
    return responseSent(res, false, 500, "Server error, try again later");
  }
};

const getSellerEarnings = async (req, res) => {
  try {
    const { role, userId } = req.auth;
    if (role !== "seller") {
      return responseSent(
        res,
        false,
        403,
        "Unauthorized: Seller access required"
      );
    }

    let {
      filter = "monthly",
      start_date,
      end_date,
      page = 1,
      limit = 10,
      searchQuery,
    } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    const now = new Date();
    let startDate, endDate;

    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999);
    } else {
      switch (filter) {
        case "yearly":
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
          break;
        case "last_15_days":
          startDate = new Date(now.setDate(now.getDate() - 15));
          endDate = new Date();
          break;
        case "last_month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        case "last_day":
          startDate = new Date(now.setDate(now.getDate() - 1));
          endDate = new Date(now.setHours(23, 59, 59));
          break;
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59));
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59
          );
      }
    }

    const query = {
      createdAt: { $gte: startDate, $lte: endDate },
      "items.product": { $exists: true },
    };

    if (searchQuery) {
      query.order_id = { $regex: searchQuery, $options: "i" };
    }

    const orders = await Order.find(query)
      .populate({ path: "items.product", select: "createdBy price" })
      .populate("payment_id");

    let totalEarnings = 0,
      pendingEarnings = 0,
      gstCollected = 0,
      pendingGST = 0,
      totalOrders = 0,
      totalProductsSold = 0;

    const earningsBreakdown = [];

    orders.forEach((order) => {
      let orderEarnings = 0;
      let orderGST = 0;
      let totalQuantity = 0;

      order.items.forEach((item) => {
        if (item.product && item.product.createdBy.toString() === userId) {
          let itemAmount = item.price * item.quantity;
          const gstAmount = itemAmount * 0.18;
          itemAmount += gstAmount;

          orderEarnings += itemAmount;
          orderGST += gstAmount;
          totalQuantity += item.quantity;

          if (order.status === "delivered") {
            totalEarnings += itemAmount;
            gstCollected += gstAmount;
            totalProductsSold += item.quantity;
          } else if (
            order.status === "shipped" ||
            order.status === "pending" ||
            order.paymentMethod === "cod"
          ) {
            pendingEarnings += itemAmount;
            pendingGST += gstAmount;
          }
        }
      });

      if (orderEarnings > 0) {
        totalOrders += 1;

        earningsBreakdown.push({
          order_id: order.order_id,
          amount: orderEarnings.toFixed(2),
          gst_amount: orderGST.toFixed(2),
          payment_method: order.paymentMethod,
          status: order.status,
          quantity: totalQuantity,
          createdAt: order.createdAt.toISOString(),
        });
      }
    });

    // Apply pagination
    const paginatedData = earningsBreakdown.slice(skip, skip + limit);
    const totalRecords = earningsBreakdown.length;
    const totalPages = Math.ceil(totalRecords / limit);

    return res.status(200).json({
      success: true,
      message: "Seller earnings fetched successfully",
      data: {
        total_earnings: totalEarnings.toFixed(2),
        pending_earnings: pendingEarnings.toFixed(2),
        total_orders: totalOrders,
        total_products_sold: totalProductsSold,
        gst_collected: gstCollected.toFixed(2),
        pending_gst: pendingGST.toFixed(2),
        earnings_breakdown: paginatedData,
        pagination: {
          totalRecords,
          totalPages,
          currentPage: page,
          limit,
        },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error, try again later",
    });
  }
};

const getAdminEarnings = async (req, res) => {
  try {
    const { role } = req.auth;
    if (role !== "admin") {
      return responseSent(
        res,
        false,
        403,
        "Unauthorized: Admin access required"
      );
    }

    let {
      filter = "monthly",
      start_date,
      end_date,
      page = 1,
      limit = 10,
      searchQuery,
    } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    const now = new Date();
    let startDate, endDate;

    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999);
    } else {
      switch (filter) {
        case "yearly":
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
          break;
        case "last_15_days":
          startDate = new Date(now.setDate(now.getDate() - 15));
          endDate = new Date();
          break;
        case "last_month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        case "last_day":
          startDate = new Date(now.setDate(now.getDate() - 1));
          endDate = new Date(now.setHours(23, 59, 59));
          break;
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59));
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59
          );
      }
    }

    const query = {
      createdAt: { $gte: startDate, $lte: endDate },
      "items.product": { $exists: true },
    };

    if (searchQuery) {
      query.order_id = { $regex: searchQuery, $options: "i" };
    }

    const orders = await Order.find(query)
      .populate({ path: "items.product", select: "createdBy price" })
      .populate("payment_id");

    let totalEarnings = 0,
      pendingEarnings = 0,
      gstCollected = 0,
      pendingGST = 0,
      totalOrders = 0,
      totalProductsSold = 0;

    const earningsBreakdown = [];

    orders.forEach((order) => {
      let orderEarnings = 0;
      let orderGST = 0;
      let totalQuantity = 0;

      order.items.forEach((item) => {
        if (item.product) {
          let itemAmount = item.price * item.quantity;
          const gstAmount = itemAmount * 0.18;
          itemAmount += gstAmount;

          orderEarnings += itemAmount;
          orderGST += gstAmount;
          totalQuantity += item.quantity;

          if (order.status === "delivered") {
            totalEarnings += itemAmount;
            gstCollected += gstAmount;
            totalProductsSold += item.quantity;
          } else if (
            ["shipped", "pending"].includes(order.status) ||
            order.paymentMethod === "cod"
          ) {
            pendingEarnings += itemAmount;
            pendingGST += gstAmount;
          }
        }
      });

      if (orderEarnings > 0) {
        totalOrders += 1;

        earningsBreakdown.push({
          order_id: order.order_id,
          amount: orderEarnings.toFixed(2),
          gst_amount: orderGST.toFixed(2),
          payment_method: order.paymentMethod,
          status: order.status,
          quantity: totalQuantity,
          createdAt: order.createdAt.toISOString(),
        });
      }
    });

    // Apply pagination
    const paginatedData = earningsBreakdown.slice(skip, skip + limit);
    const totalRecords = earningsBreakdown.length;
    const totalPages = Math.ceil(totalRecords / limit);

    return res.status(200).json({
      success: true,
      message: "Admin earnings fetched successfully",
      data: {
        total_earnings: totalEarnings.toFixed(2),
        pending_earnings: pendingEarnings.toFixed(2),
        total_orders: totalOrders,
        total_products_sold: totalProductsSold,
        gst_collected: gstCollected.toFixed(2),
        pending_gst: pendingGST.toFixed(2),
        earnings_breakdown: paginatedData,
        pagination: {
          totalRecords,
          totalPages,
          currentPage: page,
          limit,
        },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error, try again later",
    });
  }
};

// ✅ Update order status (Admin Only)
const updateOrderStatus = async (req, res) => {
  try {
    const { role } = req.auth;
    const { orderId, status } = req.body;

    if (role !== "admin") {
      return responseSent(
        res,
        false,
        403,
        "Unauthorized: Admin access required"
      );
    }

    const order = await Order.findById(orderId)
      .populate("user_id", "email first_name last_name phone")
      .populate("items.product", "title colors_images createdBy")
      .populate(
        "items.product.createdBy",
        "email first_name last_name phone seller_account"
      );

    if (!order) {
      return responseSent(res, false, 404, "Order not found");
    }

    if (!order.delivery_partner)
      return responseSent(
        res,
        false,
        404,
        "Status cannot be updated. Order is not assigned to any delivery partner."
      );

    order.status = status;
    await order.save();

    const processedOrder = await Order.findById(orderId)
      .populate("user_id", "email first_name last_name phone")
      .populate("items.product", "title colors_images createdBy")
      .populate(
        "items.product.createdBy",
        "email first_name last_name phone seller_account"
      );

    if (processedOrder) {
      let user = processedOrder.user_id;
      if (user) {
        let emailSubject = `Order Update: #${processedOrder.order_id}`;
        let emailContent = "";
        let smsContent = "";

        if (processedOrder.status !== "delivered") {
          emailContent = `Dear ${user.first_name},  
          We would like to inform you that the status of your order **#${processedOrder.order_id}** has been updated to **${processedOrder.status}**.`;

          smsContent = `Dear ${user.first_name}, your order #${processedOrder.order_id} status has been updated to ${processedOrder.status}. For details, check your account or contact support.`;
        } else {
          emailContent = `Dear ${user.first_name},  
          We are pleased to inform you that your order **#${processedOrder.order_id}** has been successfully delivered.`;

          smsContent = `Dear ${user.first_name}, your order #${processedOrder.order_id} has been successfully delivered. Thank you for choosing us!`;

          await Notifications.create({
            user_id: user?._id,
            title: `Order Delivered - #${processedOrder.order_id}`,
            description: "Your order has been successfully delivered.",
            notification_type: "order",
          });
        }

        await productConfirmation(
          user.email,
          emailSubject,
          emailContent,
          processedOrder,
          false
        );
        await sendMessage(`+${user.phone}`, smsContent);
      }
    }

    return responseSent(
      res,
      true,
      200,
      "Order status updated successfully",
      order
    );
  } catch (error) {
    console.error(error);
    return responseSent(res, false, 500, "Server error, try again later");
  }
};

const cancelOrder = async (req, res) => {
  try {
    let { userId, role } = req.auth;
    let { orderId } = req.params;
    let { reason } = req.body;

    if (!userId || !role) {
      return responseSent(
        res,
        false,
        401,
        "Unauthorized: Please login to cancel order"
      );
    }

    if (!orderId) {
      return responseSent(res, false, 400, "Order ID is required");
    }

    if (!reason) {
      return responseSent(res, false, 400, "Reason is required");
    }

    let order = await Order.findById(orderId);

    if (!order) {
      return responseSent(res, false, 404, "Order not found");
    }

    if (role !== "admin" && order.user_id.toString() !== userId) {
      return responseSent(
        res,
        false,
        403,
        "Unauthorized: Only the user or admin can cancel the order"
      );
    }

    if (order.status !== "pending") {
      return responseSent(res, false, 400, "Order cannot be cancelled");
    }

    order.status = "cancelled";
    order.cancel_reason = reason;
    order.cancel_by = userId;
    await order.save();

    const processedOrder = await Order.findById(order._id)
      .populate("user_id", "email first_name last_name phone")
      .populate("items.product", "title colors_images createdBy")
      .populate(
        "items.product.createdBy",
        "email first_name last_name phone seller_account"
      );

    if (processedOrder) {
      let user = processedOrder.user_id;
      if (user) {
        // Save a cancellation notification
        await Notifications.create({
          user_id: user?._id,
          title: `Order Canceled - #${processedOrder.order_id}`,
          description:
            "Your order has been canceled. If you need assistance, please contact support.",
          notification_type: "order",
        });
        let emailSubject = `Order Cancellation: #${processedOrder.order_id}`;
        let emailContent = `Dear ${user.first_name},
        We regret to inform you that your order **#${processedOrder.order_id}** has been **canceled**.  
        If this cancellation was not requested by you, please contact our support team immediately.`;

        let smsContent = `Dear ${user.first_name}, your order #${processedOrder.order_id} has been canceled. If you need assistance, please contact support.`;

        await productConfirmation(
          user.email,
          emailSubject,
          emailContent,
          processedOrder,
          false
        );
        await sendMessage(`+${user.phone}`, smsContent);
      }
    }

    return responseSent(res, true, 200, "Order cancelled successfully", {
      order,
    });
  } catch (error) {
    responseSent(res, false, 500, "Server error, try again later");
  }
};

const assignDeliveryPartner = async (req, res) => {
  try {
    let { userId, role } = req.auth;

    if (!userId || role !== "admin") {
      return responseSent(res, false, 403, "Unauthorized access.");
    }

    const { orderId, deliveryPartnerId } = req.body;

    // Validate input
    if (!orderId || !deliveryPartnerId) {
      return responseSent(
        res,
        false,
        400,
        "Order ID and Delivery Partner ID are required."
      );
    }

    // Fetch the order
    const order = await Order.findOne({ _id: orderId })
      .populate("user_id", "email first_name last_name phone")
      .populate("items.product", "title colors_images createdBy")
      .populate(
        "items.product.createdBy",
        "email first_name last_name phone seller_account"
      );
    if (!order) {
      return responseSent(res, false, 404, "Order not found.");
    }

    // Fetch the delivery partner
    const deliveryPartner = await DeliveryPartner.findOne({
      _id: deliveryPartnerId,
    });
    if (!deliveryPartner) {
      return responseSent(res, false, 404, "Delivery Partner not found.");
    }

    // Assign the delivery partner
    order.delivery_partner = deliveryPartnerId;
    // order.status = "assigned"; // Update order status

    await order.save();

    const processedOrder = await Order.findOne({ _id: orderId })
      .populate("user_id", "email first_name last_name phone")
      .populate("items.product", "title colors_images createdBy")
      .populate(
        "items.product.createdBy",
        "email first_name last_name phone seller_account"
      );

    if (processedOrder) {
      let customer = processedOrder.user_id;
      if (
        customer.first_name &&
        customer.last_name &&
        customer.email &&
        customer.phone
      ) {
        let emailSubject = "Order Assigned to Delivery Partner";
        let emailContent = `Dear ${customer.first_name},  
        We are pleased to inform you that your order (Order ID: ${processedOrder.order_id}) has been assigned to our delivery partner, **${deliveryPartner.name}**. You will receive further updates regarding the delivery status.  
        For any inquiries, feel free to contact the delivery partner at **${deliveryPartner.phone}**.  
        `;

        let smsContent = `Dear ${customer.first_name}, your order (ID: ${processedOrder.order_id}) has been assigned to ${deliveryPartner.name}. Status: ${processedOrder.status}. Contact: ${deliveryPartner.phone}. Thank you for choosing us!`;

        await sendMessage(`+${customer.phone}`, smsContent);

        await productConfirmation(
          customer.email,
          emailSubject,
          emailContent,
          processedOrder,
          false
        );
      }
    }

    return responseSent(
      res,
      true,
      200,
      "Delivery Partner assigned successfully.",
      { order }
    );
  } catch (error) {
    console.error(error);
    return responseSent(res, false, 500, "Server error, try again later");
  }
};

module.exports = {
  defaultRoute,
  createOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  deliverTryBuyItems,
  estimateTryBuyCost,
  assignDeliveryPartner,

  // seller
  getAllSellerOrders,
  getSellerEarnings,

  //admin
  getAdminEarnings,
};
