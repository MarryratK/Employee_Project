require('dotenv').config();
const jwt = require('jsonwebtoken');
const token_env = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    jwt.verify(token, token_env, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Access Denied' });
        }
        req.user = user;
        next();
    });
}

module.exports = authenticateToken;

// this is my middleware for authentication, I will use it in the routes to protect the endpoints that require authentication.