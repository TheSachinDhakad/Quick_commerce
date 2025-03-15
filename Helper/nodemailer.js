const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com", // Your SMTP server
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_ID, // Your email
    pass: process.env.EMAIL_PASS, // Your email password
  },
});

const sendVerificationEmail = async (userEmail, verificationLink) => {
  try {
    // Create transporter

    let emailTemplate = `<!DOCTYPE html>
<html>
<head>

  <meta charset="utf-8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>Email Confirmation</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style type="text/css">
  /**
   * Google webfonts. Recommended to include the .woff version for cross-client compatibility.
   */
  @media screen {
    @font-face {
      font-family: 'Source Sans Pro';
      font-style: normal;
      font-weight: 400;
      src: local('Source Sans Pro Regular'), local('SourceSansPro-Regular'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/ODelI1aHBYDBqgeIAH2zlBM0YzuT7MdOe03otPbuUS0.woff) format('woff');
    }
    @font-face {
      font-family: 'Source Sans Pro';
      font-style: normal;
      font-weight: 700;
      src: local('Source Sans Pro Bold'), local('SourceSansPro-Bold'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/toadOcfmlt9b38dHJxOBGFkQc6VGVFSmCnC_l7QZG60.woff) format('woff');
    }
  }
  /**
   * Avoid browser level font resizing.
   * 1. Windows Mobile
   * 2. iOS / OSX
   */
  body,
  table,
  td,
  a {
    -ms-text-size-adjust: 100%; /* 1 */
    -webkit-text-size-adjust: 100%; /* 2 */
  }
  /**
   * Remove extra space added to tables and cells in Outlook.
   */
  table,
  td {
    mso-table-rspace: 0pt;
    mso-table-lspace: 0pt;
  }
  /**
   * Better fluid images in Internet Explorer.
   */
  img {
    -ms-interpolation-mode: bicubic;
  }
  /**
   * Remove blue links for iOS devices.
   */
  a[x-apple-data-detectors] {
    font-family: inherit !important;
    font-size: inherit !important;
    font-weight: inherit !important;
    line-height: inherit !important;
    color: inherit !important;
    text-decoration: none !important;
  }
  /**
   * Fix centering issues in Android 4.4.
   */
  div[style*="margin: 16px 0;"] {
    margin: 0 !important;
  }
  body {
    width: 100% !important;
    height: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  /**
   * Collapse table borders to avoid space between cells.
   */
  table {
    border-collapse: collapse !important;
  }
  a {
    color: #1a82e2;
  }
  img {
    height: auto;
    line-height: 100%;
    text-decoration: none;
    border: 0;
    outline: none;
  }
  </style>

</head>
<body style="background-color: #e9ecef;">

  <!-- start preheader -->
  <div class="preheader" style="display: none; max-width: 0; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
    Verify your email to secure your account. Click the link inside to complete the process.
  </div>
  <!-- end preheader -->

  <!-- start body -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%">

    <!-- start hero -->
    <tr>
      <td align="center" bgcolor="#e9ecef">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 36px 24px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-top: 3px solid #d4dadf;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 48px;">Confirm Your Email Address</h1>
            </td>
          </tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
    <!-- start copy block -->
    <tr>
      <td align="center" bgcolor="#e9ecef">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">

          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
              <p style="margin: 0;">Tap the button below to confirm your email address. If you didn't create an account with <a href="https://www.binarythreads.in">${process.env.COMPANY_NAME}</a>, you can safely delete this email.</p>
            </td>
          </tr>
          <tr>
            <td align="left" bgcolor="#ffffff">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" bgcolor="#ffffff" style="padding: 12px;">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" bgcolor="#1a82e2" style="border-radius: 6px;">
                          <a href="${process.env.WEB_URI}${verificationLink}" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px;">Confirm Email</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
              <p style="margin: 0;">If that doesn't work, copy and paste the following link in your browser:</p>
              <p style="margin: 0;"><a href="${process.env.WEB_URI}${verificationLink}" target="_blank">${process.env.WEB_URI}${verificationLink}</a></p>
            </td>
          </tr>
          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; border-bottom: 3px solid #d4dadf">
              <p style="margin: 0;">Cheers,<br> ${process.env.COMPANY_NAME}</p>
            </td>
          </tr>

        </table>
        </td>
        </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" bgcolor="#e9ecef" style="padding: 24px;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">

          <tr>
            <td align="center" bgcolor="#e9ecef" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
              <p style="margin: 0;">You received this email because we received a request for email verification for your account. If you didn't request a verification email, you can safely delete this email.</p>
            </td>
          </tr>
          <tr>
            <td align="center" bgcolor="#e9ecef" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
              <p style="margin: 0;">To stop receiving these emails, you can <a href="${process.env.WEB_URI}" target="_blank">unsubscribe</a> at any time.</p>
              <p style="margin: 0;">${process.env.COMPANY_NAME}, 1234 S. Broadway St. City, State 12345</p>
            </td>
          </tr>

        </table>
        </td>
        </tr>
        </table>
      </td>
    </tr>

  </table>

</body>
</html>`;

    // Email options
    const mailOptions = {
      from: `${process.env.COMPANY_NAME} <${process.env.EMAIL_ID}>`,
      to: userEmail,
      bcc: process.env.EMAIL_ID,
      subject: `Verify Your Email - ${process.env.COMPANY_NAME}`,
      html: emailTemplate,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info);
    return info.messageId;
  } catch (error) {
    return false;
  }
};

const sendVerificationEmailResetPassword = async (
  userEmail,
  verificationLink
) => {
  try {
    // Create transporter

    let emailTemplate = `<!DOCTYPE html>
<html>
<head>

  <meta charset="utf-8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>Email Confirmation</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style type="text/css">
  /**
   * Google webfonts. Recommended to include the .woff version for cross-client compatibility.
   */
  @media screen {
    @font-face {
      font-family: 'Source Sans Pro';
      font-style: normal;
      font-weight: 400;
      src: local('Source Sans Pro Regular'), local('SourceSansPro-Regular'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/ODelI1aHBYDBqgeIAH2zlBM0YzuT7MdOe03otPbuUS0.woff) format('woff');
    }
    @font-face {
      font-family: 'Source Sans Pro';
      font-style: normal;
      font-weight: 700;
      src: local('Source Sans Pro Bold'), local('SourceSansPro-Bold'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/toadOcfmlt9b38dHJxOBGFkQc6VGVFSmCnC_l7QZG60.woff) format('woff');
    }
  }
  /**
   * Avoid browser level font resizing.
   * 1. Windows Mobile
   * 2. iOS / OSX
   */
  body,
  table,
  td,
  a {
    -ms-text-size-adjust: 100%; /* 1 */
    -webkit-text-size-adjust: 100%; /* 2 */
  }
  /**
   * Remove extra space added to tables and cells in Outlook.
   */
  table,
  td {
    mso-table-rspace: 0pt;
    mso-table-lspace: 0pt;
  }
  /**
   * Better fluid images in Internet Explorer.
   */
  img {
    -ms-interpolation-mode: bicubic;
  }
  /**
   * Remove blue links for iOS devices.
   */
  a[x-apple-data-detectors] {
    font-family: inherit !important;
    font-size: inherit !important;
    font-weight: inherit !important;
    line-height: inherit !important;
    color: inherit !important;
    text-decoration: none !important;
  }
  /**
   * Fix centering issues in Android 4.4.
   */
  div[style*="margin: 16px 0;"] {
    margin: 0 !important;
  }
  body {
    width: 100% !important;
    height: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  /**
   * Collapse table borders to avoid space between cells.
   */
  table {
    border-collapse: collapse !important;
  }
  a {
    color: #1a82e2;
  }
  img {
    height: auto;
    line-height: 100%;
    text-decoration: none;
    border: 0;
    outline: none;
  }
  </style>

</head>
<body style="background-color: #e9ecef;">

 <!-- start preheader -->
    <div class="preheader" style="display: none; max-width: 0; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
      You requested to reset your password. Click the link inside to create a new password.
    </div>
<!-- end preheader -->


  <!-- start body -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%">

    <!-- start hero -->
    <tr>
      <td align="center" bgcolor="#e9ecef">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 36px 24px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-top: 3px solid #d4dadf;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 48px;">Reset Your Password</h1>
            </td>
          </tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
    <!-- start copy block -->
    <tr>
      <td align="center" bgcolor="#e9ecef">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">

         <tr>
          <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333;">
            <p style="margin: 0;">
              You recently requested to reset your password for your 
              <a href="${process.env.WEB_URI}" target="_blank" rel="noopener noreferrer" style="color: #1a82e2; text-decoration: none; font-weight: bold;">
                ${process.env.COMPANY_NAME}
              </a> account. Click the button below to reset your password.
            </p>
          </td>
        </tr>
          <tr>
            <td align="left" bgcolor="#ffffff">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" bgcolor="#ffffff" style="padding: 12px;">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" bgcolor="#1a82e2" style="border-radius: 6px;">
                          <a href="${process.env.WEB_URI}${verificationLink}" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px;">Reset Password</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
              <p style="margin: 0;">If that doesn't work, copy and paste the following link in your browser:</p>
              <p style="margin: 0;"><a href="${process.env.WEB_URI}${verificationLink}" target="_blank">${process.env.WEB_URI}${verificationLink}</a></p>
            </td>
          </tr>
          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; border-bottom: 3px solid #d4dadf">
              <p style="margin: 0;">Cheers,<br> ${process.env.COMPANY_NAME}</p>
            </td>
          </tr>

        </table>
        </td>
        </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" bgcolor="#e9ecef" style="padding: 24px;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">

          <tr>
            <td align="center" bgcolor="#e9ecef" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
              <p style="margin: 0;">You received this email because we received a request for password reset for your account. If you didn't request a password reset, you can safely delete this email.</p>
            </td>
          </tr>
          <tr>
            <td align="center" bgcolor="#e9ecef" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
              <p style="margin: 0;">To stop receiving these emails, you can <a href="${process.env.WEB_URI}" target="_blank">unsubscribe</a> at any time.</p>
              <p style="margin: 0;">${process.env.COMPANY_NAME}, 1234 S. Broadway St. City, State 12345</p>
            </td>
          </tr>

        </table>
        </td>
        </tr>
        </table>
      </td>
    </tr>

  </table>

</body>
</html>`;

    // Email options
    const mailOptions = {
      from: `${process.env.COMPANY_NAME} <${process.env.EMAIL_ID}>`,
      to: userEmail,
      bcc: process.env.EMAIL_ID,
      subject: `Reset Your Password - ${process.env.COMPANY_NAME}`,
      html: emailTemplate,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    return info.messageId;
  } catch (error) {
    return false;
  }
};

const productConfirmation = async (
  userEmail,
  title,
  message,
  order,
  isSellerAdmin = false
) => {
  try {
    console.log(userEmail, title, message, order, isSellerAdmin);

    // Define status subtext dynamically for Customer & Admin/Seller
    const statusMessages = {
      customer: {
        pending: "Your order is being processed.",
        paid: "Your payment has been received.",
        shipped: "Your order is on the way.",
        delivered: "Your order has been delivered successfully.",
        cancelled: "Your order has been cancelled.",
        returned: "Your order has been returned.",
        payment_pending: "Your payment is pending. Please complete it.",
      },
      admin: {
        pending: "New order received. Process it soon.",
        paid: "Payment received. Prepare the shipment.",
        shipped: "Order has been shipped to the customer.",
        delivered: "Order has been delivered successfully.",
        cancelled: "Order has been cancelled by the customer.",
        returned: "Customer has requested a return. Review it.",
        payment_pending: "Customer's payment is pending. Follow up if needed.",
      },
    };

    // Select appropriate status messages based on `isSellerAdmin`
    const selectedStatusMessages = isSellerAdmin
      ? statusMessages.admin
      : statusMessages.customer;

    let emailTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f1f1f1;
            margin: 0;
            padding: 0;
            font-size: 12px;
        }
        .container {
            max-width: 600px;
            background-color:#f8f8f8;
            margin: 20px auto;
            padding: 20px;
            border-radius: 0px;
            box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .logo {
            max-width: 150px;
            margin-bottom: 20px;
        }
        h2 {
            color: #333;
            font-size: 16px;
        }
        .order-details {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }
        .order-details th, .order-details td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
            font-size: 12px;
        }
        .order-details th {
            background-color: #f5f5f5;
        }
        .product-image {
            width: 60px;
            height: 60px;
            object-fit: cover;
        }
        .status-p {
          text-align: left;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 10px;
            font-size: 12px;
            font-weight: bold;
        }
        .status-pending { background: #FFF3CD; color: #856404; }
        .status-paid { background: #D1ECF1; color: #0C5460; }
        .status-shipped { background: #CCE5FF; color: #004085; }
        .status-delivered { background: #ECFBEC; color: green; }
        .status-cancelled, .status-returned { background: #F8D7DA; color: #721C24; }
        .status-payment_pending { background: #FFF3CD; color: #856404; }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #888;
            margin-top: 20px;
        }
        .summary-table {
            width: 100%;
            margin-top: 10px;
            border-top: 2px solid #ddd;
            text-align: right;
        }
        .summary-table td {
            padding: 8px;
            font-size: 12px;
        }
        .summary-table .total {
            font-size: 14px;
            font-weight: bold;
        }
    </style>
</head>
<body>

    <div class="container">
        <img src="https://e-com-five-amber.vercel.app/static/media/BLACK%20LOGO-02.9dfc51c6b5a7ee6e97fc.png" alt="Company Logo" class="logo">
        <h2>${title}</h2>
        <p style="text-align: left;">${
          message || "Thank you for your order!"
        }</p>

        <table class="order-details">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Details</th>
                    <th>Price</th>
                </tr>
            </thead>
            <tbody>
            ${order?.items
              ?.map(
                (item) => `
                <tr>
                  <td><img src="${process.env.AWS_BASE_URI}${item.product.colors_images[0].images[0]}" alt="Product Image" class="product-image"></td>
                  <td>
                      <strong>${item?.product?.title}</strong><br>
                      Color: ${item?.color}<br>
                      Size: ${item?.size}<br>
                      Quantity: ${item?.quantity}
                  </td>
                  <td>₹${item?.price}</td>
                </tr>`
              )
              .join("")}
            </tbody>
        </table>
        
        <p class="status-p">
            <span class="status-badge status-${order?.status}">${
      order?.status?.charAt(0)?.toUpperCase() + order?.status?.slice(1)
    }</span>
            ${selectedStatusMessages[order?.status] || "Status not available."}
        </p>

        <table class="summary-table">
            <tr>
                <td>Subtotal:</td>
                <td>₹${order?.totalPrice}</td>
            </tr>
            <tr>
                <td>GST (18%):</td>
                <td>₹${order?.gstAmount}</td>
            </tr>
            <tr>
                <td>Discount:</td>
                <td>-₹${order?.discountAmount}</td>
            </tr>
            <tr class="total">
                <td>Grand Total:</td>
                <td>₹${order?.finalAmount}</td>
            </tr>
        </table>

        <div class="footer">
            Need help? Contact our support team at support@example.com
        </div>
    </div>

</body>
</html>`;

    // Email options
    const mailOptions = {
      from: `${process.env.COMPANY_NAME} <${process.env.EMAIL_ID}>`,
      to: userEmail,
      bcc: process.env.EMAIL_ID,
      subject: isSellerAdmin
        ? `New Order Notification – ${process.env.COMPANY_NAME}`
        : `Order Update & Details – ${process.env.COMPANY_NAME}`,
      html: emailTemplate,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(info);
    return info.messageId;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

const sendNewsLetterConfirmation = async (email, token) => {
  try {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Newsletter Subscription Confirmation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f7f7f7;
            margin: 0;
            padding: 0;
        }

        .email-wrapper {
            background-color: #f7f7f7;
            padding: 30px 0;
            text-align: center;
        }

        .email-container {
            background-color: #ffffff;
            border-radius: 0px;
            margin: 0 auto;
            max-width: 600px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            padding: 40px;
            text-align: left;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
        }

        .header h1 {
            color: #2c3e50;
            font-size: 14px; /* Updated heading size */
            margin-bottom: 10px;
            font-weight: bold;
        }

        .message p {
            font-size: 12px; /* Updated text size */
            color: #34495e;
            line-height: 1.6;
            margin-bottom: 15px;
        }

        .cta-button {
            display: inline-block;
            background-color: #000000;
            color: #ffffff;
            text-decoration: none;
            padding: 7px 10px;
            border-radius: 4px;
            font-size: 12px;
            margin-top: 20px;
            font-weight: bold;
        }

        .cta-button:hover {
            background-color: #2980b9;
        }

        .footer {
            text-align: left; /* Aligning the footer text to the left */
            margin-top: 30px;
            font-size: 10px; /* Reduced text size for footer */
            color: #7f8c8d;
        }

        .footer a {
            color: #3498db;
            text-decoration: none;
        }

        .footer p {
            margin: 5px 0;
        }

        .footer .logo {
            display: block;
            width: 80px; /* Adjust the width of the logo */
        }

    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="header">
                <h1>Welcome to Our Newsletter!</h1>
                <p style="font-size: 18px; color: #7f8c8d;">We're excited to have you with us.</p>
            </div>

            <div class="message">
                <p>Hi Dear User,</p>
                <p>Thank you for subscribing to our newsletter! You're now part of our community, and we'll send you the latest updates, exclusive offers, and more directly to your inbox.</p>
                <p>If you'd ever like to unsubscribe, you can easily do so by clicking the button below:</p>
                <a href="${process.env.WEB_URI}/unsubscribe?email=${email}&token=${token}" class="cta-button">Unsubscribe</a>
            </div>

            <div class="footer">
                <!-- Company Logo -->
                <img src="https://e-com-five-amber.vercel.app/static/media/BLACK%20LOGO-02.9dfc51c6b5a7ee6e97fc.png" alt="Company Logo" class="logo">
                <p>Best regards,</p>
                <p><strong>The ${process.env.COMPANY_NAME} Team</strong></p>
                <p><a href="${process.env.WEB_URI}">Visit our website</a></p>
            </div>
        </div>
    </div>
</body>
</html>
`;
    // Email options
    const mailOptions = {
      from: `${process.env.COMPANY_NAME} <${process.env.EMAIL_ID}>`,
      to: email,
      bcc: process.env.EMAIL_ID,
      subject: `Newsletter Subscription Confirmation - ${process.env.COMPANY_NAME}`,
      html: html,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email}=> `, info.messageId);
    return info.messageId;
  } catch (error) {
    return false;
  }
};

const sendUnsubscribeConfirmation = async (email, token) => {
  try {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unsubscribe Confirmation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f7f7f7;
            margin: 0;
            padding: 0;
        }

        .email-wrapper {
            background-color: #f7f7f7;
            padding: 30px 0;
            text-align: center;
        }

        .email-container {
            background-color: #ffffff;
            border-radius: 0px;
            margin: 0 auto;
            max-width: 600px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            padding: 40px;
            text-align: left;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
        }

        .header h1 {
            color: #2c3e50;
            font-size: 14px; /* Updated heading size */
            margin-bottom: 10px;
            font-weight: bold;
        }

        .message p {
            font-size: 12px; /* Updated text size */
            color: #34495e;
            line-height: 1.6;
            margin-bottom: 15px;
        }

        .cta-button {
            display: inline-block;
            background-color: #000000;
            color: #ffffff;
            text-decoration: none;
            padding: 7px 10px;
            border-radius: 4px;
            font-size: 12px;
            margin-top: 20px;
            font-weight: bold;
        }

        .cta-button:hover {
            background-color: #2980b9;
        }

        .footer {
            text-align: left; /* Aligning the footer text to the left */
            margin-top: 30px;
            font-size: 10px; /* Reduced text size for footer */
            color: #7f8c8d;
        }

        .footer a {
            color: #3498db;
            text-decoration: none;
        }

        .footer p {
            margin: 5px 0;
        }

        .footer .logo {
            display: block;
            width: 80px; /* Adjust the width of the logo */
        }

    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="header">
                <h1>You Have Unsubscribed</h1>
                <p style="font-size: 18px; color: #7f8c8d;">We're sorry to see you go.</p>
            </div>

            <div class="message">
                <p>Hi Dear User,</p>
                <p>We're sorry to inform you that you've been successfully unsubscribed from our newsletter.</p>
                <p>If this was a mistake or you'd like to resubscribe, simply click the button below:</p>
                <a href="${process.env.WEB_URI}/unsubscribe?email=${email}&token=${token}&action=resubscribe" class="cta-button">Resubscribe</a>
            </div>

            <div class="footer">
                <!-- Company Logo -->
                <img src="https://e-com-five-amber.vercel.app/static/media/BLACK%20LOGO-02.9dfc51c6b5a7ee6e97fc.png" alt="Company Logo" class="logo">
                <p>Best regards,</p>
                <p><strong>The ${process.env.COMPANY_NAME} Team</strong></p>
                <p><a href="${process.env.WEB_URI}">Visit our website</a></p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    // Email options
    const mailOptions = {
      from: `${process.env.COMPANY_NAME} <${process.env.EMAIL_ID}>`,
      to: email,
      bcc: process.env.EMAIL_ID,
      subject: `Unsubscribe Confirmation - ${process.env.COMPANY_NAME}`,
      html: html,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(
      `Unsubscribe confirmation email sent to ${email} => `,
      info.messageId
    );
    return info.messageId;
  } catch (error) {
    console.error("Error sending unsubscribe confirmation email:", error);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendVerificationEmailResetPassword,
  productConfirmation,
  sendNewsLetterConfirmation,
  sendUnsubscribeConfirmation,
};
