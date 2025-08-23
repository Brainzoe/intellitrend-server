import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const testEmail = async () => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  transporter.verify((err: any, success: any) => {
    if (err) console.error("SMTP error:", err);
    else console.log("SMTP is ready to send emails");
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_USER,
    subject: "Test Email",
    text: "This is a test email from your Node.js app!",
  });
};

testEmail();
