const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// अपने सीक्रेट की को सुरक्षित रखें और एन्वायरनमेंट वेरिएबल्स का उपयोग करें
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// टोकन जनरेशन फंक्शन
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// टोकन रीफ्रेश रूट
exports.refreshToken = async (req, res) => {
// router.post('/refresh-token', (req, res) => {
  const refreshToken = req.cookies.refreshToken; // कुकीज़ से रीफ्रेश टोकन प्राप्त करें

  if (!refreshToken) {
    return res.status(401).json({ message: 'रीफ्रेश टोकन नहीं मिला' });
  }

  try {
    // रीफ्रेश टोकन को वेरिफाई करें
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    // नए टोकन जनरेट करें
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

    // नया रीफ्रेश टोकन कुकी में सेट करें
    res.cookie('refreshToken', newRefreshToken, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 दिन
    });

    // नया एक्सेस टोकन भेजें
    res.json({ token: accessToken });
  } catch (error) {
    console.error('टोकन रीफ्रेश में त्रुटि:', error);
    res.status(403).json({ message: 'अमान्य या समाप्त रीफ्रेश टोकन' });
  }
};

