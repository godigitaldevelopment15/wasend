const cors = require("cors");
const morgan = require("morgan");
const config = require('./config/config');
const connectDB = require('./config/db');
const fs = require('fs');
const path = require('path');
const express = require("express");
const http = require('http');
const client = require('./config/whatsapp');
const authApiRoute = require('./routes/api/auth');
const mongoose= require('mongoose')
const app = express();
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = socketIo(server);

// Connect to database
connectDB();

// Set view engine and middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan("dev"));
app.use(cors());

// Handle WhatsApp Client Events
client.on('qr', (qr) => {
  console.log('QR RECEIVED', qr);
  fs.writeFileSync("./tempStorage/last.qr", qr);
});

client.on('ready', () => {
  const clientInfo = client.info;
  io.emit('clientReady', { status: 'ready', clientInfo });
});

client.on('authenticated', () => {
  console.log('Authentication successful.');
  try {
    fs.unlinkSync("./tempStorage/last.qr");
  } catch (err) {
    console.log('Error deleting QR file:', err);
  }
});

client.on('auth_failure', (message) => {
  console.log('Authentication failure reason:', message);
});

client.on('disconnected', () => {
   client.logout();
  io.emit('clientDisconnected', { status: 'disconnected' });
});

client.on('message', async (message) => {
  console.log(message.from, ":", message.body);
});

client.initialize();

// API Routes
app.use('/api/auth', authApiRoute);
// Send message API
app.post('/login', async (req, res) => {
  const { phone, password } = req.body;

  try {
    const db = mongoose.connection.db;
    const collection = db.collection('login');
    const user = await collection.findOne({ phone });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    if (user.password === password) {
      return res.status(200).json({ message: '1', user });
    } else {
      return res.status(400).json({ message: 'Invalid phone number or password' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Server error');
  }
});
app.post('/api/send/message', async (req, res) => {
  try {
    const phone = req.body.phone.trim();
    const messageText = req.body.message;

    if (!/^\d{10,15}$/.test(phone)) {
      return res.json({
        status: "error",
        message: "Invalid phone number format.",
      });
    }

    const chatId = `${phone}@c.us`;
    const isRegistered = await client.isRegisteredUser(chatId);

    if (!isRegistered) {
      return res.json({
        status: "error",
        message: "The provided phone number is not registered on WhatsApp.",
      });
    }

    const message = await client.sendMessage(chatId, messageText);
    return res.json({
      status: "success",
      message,
    });
  } catch (err) {
    console.error('Error sending message:', err);
    return res.json({
      status: "error",
      message: err.message,
    });
  }
});

// Send image API
const { MessageMedia } = require('whatsapp-web.js');

app.post('/api/send/image', async (req, res) => {
  try {
    const { phone, caption } = req.body;
    const filePath = path.join(__dirname, './media/sample.pdf');
    const media = MessageMedia.fromFilePath(filePath);
    const recipient = phone.endsWith('@c.us') ? phone : `${phone}@c.us`;
    const msg = await client.sendMessage(recipient, media, { caption });

    return res.json({
      status: 'successful',
      media: msg,
    });
  } catch (err) {
    return res.json({
      status: "error",
      message: err.message || "An unexpected error occurred",
    });
  }
});

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  // You can listen to any custom events here, like a custom message or broadcast
  socket.on('customEvent', (data) => {
    console.log('Custom event data:', data);
    // Handle the event here
  });
});

// Server Configuration
const PORT = config.port || 3000;
server.listen(PORT, (err) => {
  if (err) {
    console.error(`ERROR While Starting Server : ${err}`);
  } else {
    console.log(`Server is running on port ${PORT}`);
  }
});
