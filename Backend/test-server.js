import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

app.post('/api/auth/register', (req, res) => {
  console.log('Registration attempt:', req.body);
  res.json({
    success: true,
    message: 'Registration successful',
    token: 'test-token',
    user: {
      id: '123',
      username: req.body.username,
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  res.json({
    success: true,
    message: 'Login successful',
    token: 'test-token',
    user: {
      id: '123',
      username: 'testuser',
      email: req.body.email,
      firstName: 'Test',
      lastName: 'User'
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});