require("dotenv").config();
const axios = require("axios");
const nodemailer = require("nodemailer");

// ✅ Environment থেকে তথ্য নিচ্ছি
const API_KEY = process.env.API_KEY;
const ADDRESS = process.env.ADDRESS.toLowerCase();
const CHAIN_ID = process.env.CHAIN_ID;

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const GMAIL_RECEIVER = process.env.GMAIL_RECEIVER;

let lastTxHash = null;

// Gmail SMTP সেটআপ
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
});

// ইমেইল পাঠানোর ফাংশন
function sendEmailNotification(tx) {
  const tokenAmount = tx.value / Math.pow(10, tx.tokenDecimal);

  const mailOptions = {
    from: `"📥 Token Alert" <${GMAIL_USER}>`,
    to: GMAIL_RECEIVER,
    subject: `✅ ${tx.tokenSymbol} ইনকামিং টোকেন ট্রানজেকশন`,
    text: `
📥 নতুন ${tx.tokenSymbol} ইনকামিং টোকেন পাওয়া গেছে!

🔸 Amount: ${tokenAmount}
🔸 From: ${tx.from}
🔸 To: ${tx.to}
🔸 Tx Hash: ${tx.hash}
🔸 Time: ${new Date(tx.timeStamp * 1000).toLocaleString()}

🔗 View on BscScan: https://bscscan.com/tx/${tx.hash}
    `,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error("❌ ইমেইল পাঠাতে সমস্যা:", err.message);
    } else {
      console.log("📩 ইমেইল পাঠানো হয়েছে:", info.response);
    }
  });
}

// ইনকামিং টোকেন ট্রানজেকশন চেক করার ফাংশন
async function checkNewIncomingTokenTx() {
  try {
    const url = `https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}&module=account&action=tokentx&address=${ADDRESS}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}`;
    
    const res = await axios.get(url);
    const txs = res.data.result;

    if (!txs || txs.length === 0) {
      console.log("🚫 কোনো টোকেন ট্রানজেকশন পাওয়া যায়নি।");
      return;
    }

    const latestTx = txs[0];

    if (
      latestTx.hash !== lastTxHash &&
      latestTx.to &&
      latestTx.to.toLowerCase() === ADDRESS
    ) {
      console.log("📥 নতুন ইনকামিং টোকেন ট্রানজেকশন!");
      console.log(`Token: ${latestTx.tokenSymbol}, Amount: ${latestTx.value / Math.pow(10, latestTx.tokenDecimal)}`);
      lastTxHash = latestTx.hash;
      sendEmailNotification(latestTx);
    } else {
      console.log("✅ নতুন ইনকামিং কিছু নেই।");
    }

  } catch (err) {
    console.error("❌ স্ক্রিপ্টে সমস্যা:", err.message);
  }
}

// শুরু করো মনিটরিং
console.log("📡 ইনকামিং টোকেন মনিটরিং + Gmail নোটিফিকেশন শুরু...");
checkNewIncomingTokenTx();
setInterval(checkNewIncomingTokenTx, 20 * 1000); // প্রতি ২০ সেকেন্ডে চেক
