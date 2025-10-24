const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const auth = require('./middleware/auth'); 
const authRoutes = require('./routes/authRoutes'); 
const User = require('./models/User');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware (Universal CORS FIX) ---

// This final configuration explicitly allows your Render domain and uses 
// a universal wildcard check for flexible deployment.
const ALLOWED_ORIGINS = [
    'https://mern-endterm.vercel.app', 
    'https://mern-endterm-czx9.vercel.app', 
    'https://mern-endterm2.onrender.com', // Added the specific Render frontend domain
    'http://localhost:3000'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like Postman or server-to-server calls)
        if (!origin) return callback(null, true);
        
        // Check if the origin is in our allowed list OR if it ends with a deployment domain
        if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) {
            return callback(null, true);
        } else {
            const msg = `Origin ${origin} is not allowed by the server's CORS policy.`;
            return callback(new Error(msg), false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true 
}));

app.use(express.json()); 

// --- MongoDB Connection ---

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });


// --- Mongoose Schema and Model ---

const expenseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, 
  },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const Expense = mongoose.model('Expense', expenseSchema);


// --- Public Routes & AUTH ROUTES ---

// Default route for health check
app.get('/', (req, res) => {
    res.send('Expense Tracker API is running - CORS FIX IS LIVE.');
});

// Authentication Routes (uses the separate router file)
// Note: This mounts authRoutes to the /auth path
app.use('/auth', authRoutes);


// --- Protected Expense Routes (REQUIRES JWT) ---

// GET all expenses for the LOGGED-IN user
app.get('/expenses', auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user.id }).sort({ date: -1 }); 
    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST a new expense for the LOGGED-IN user
app.post('/expenses', auth, async (req, res) => {
  const { description, amount } = req.body;
  if (!description || !amount) {
    return res.status(400).json({ message: 'Description and amount are required.' });
  }
  const newExpense = new Expense({ 
    user: req.user.id,
    description, 
    amount: Number(amount) 
  });
  try {
    const savedExpense = await newExpense.save();
    res.status(201).json(savedExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
