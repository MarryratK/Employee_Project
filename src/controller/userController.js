const connection = require('../../config/config');
const logError = require('../utils/log_helper');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function register(req, res) {
    const {username, password} = req.body;
    if (!username || !password) {
        return res.status(400).json({message: 'Username and password are required', isSuccess: false});
    }
    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            logError(res, err, 'userController');
            return;
        }
        const dbQuery = 'INSERT INTO tbl_user (username, password) VALUES (?, ?)';
        connection.query(dbQuery, [username, hash], (err, results) => {
            if (err) {
                logError(res, err, 'userController');
                return;
            }
            res.status(201).json({message: 'User registered successfully'});
        });
    });
}
function login(req, res) {
    const {username, password} = req.body;
    if (!username || !password) {
        return res.status(400).json({message: 'Username and password are required', isSuccess: false});
    }
    const dbQuery = 'SELECT username, password FROM tbl_user WHERE username = ?';
    connection.query(dbQuery, [username], (err, results) => {
        if (err) {
            logError(res, err, 'userController');
            return;
        }
        if (results.length === 0) {
            return res.status(401).json({message: 'Invalid credentials'});
        }
        const user = results[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                logError(res, err, 'userController');
                return;
            }
            if (!isMatch) {
                return res.status(401).json({message: 'Invalid credentials'});
            }
            const token = jwt.sign({username: user.username}, process.env.JWT_SECRET, {expiresIn: '1h'});
            res.json({token});
        });
    });
}

function getUserlist(req, res) {
    const dbQuery = 'SELECT * FROM tbl_user';
    connection.query(dbQuery, (err, results) => {
        if (err) {
            logError(res, err, 'userController');
            return;
        }
        res.json(results);
    });
}

function getUserbyId(req, res) {
    const userId = req.params.id;
    const dbQuery = 'SELECT username, password, remark FROM tbl_user WHERE user_id = ?';
    connection.query(dbQuery, [userId], (err, results) => {
        if (err) {
            logError(res, err, 'userController');
            return;
        }
        if (results.length === 0) {
            return res.status(404).json({message: 'User not found'});
        }
        res.json(results[0]);
    });
}

function updateUser(req, res) {
    const userId = req.params.id;
    const dbQuery = 'SELECT password FROM tbl_user WHERE user_id = ?';
    connection.query(dbQuery, [userId], (err, results) => {
        if (err) {
            logError(res, err, 'userController');
            return;
        }
        if (results.length === 0) {
            return res.status(404).json({message: 'User not found'});
        }
        const currentPassword = results[0].password;
        bcrypt.compare(req.body.password, currentPassword, (err, isMatch) => {
            if (err) {
                logError(res, err, 'userController');
                return;
            }
            if (!isMatch) {
                return res.status(401).json({message: 'Require current password'});
            }
            const newPassword = req.body.newPassword;
            bcrypt.hash(newPassword, 10, (err, hash) => {
                if (err) {
                    logError(res, err, 'userController');
                    return;
                }
                const updateQuery = 'UPDATE tbl_user SET password = ? WHERE user_id = ?';
                connection.query(updateQuery, [hash, userId], (err, results) => {
                    if (err) {
                        logError(res, err, 'userController');
                        return;
                    }
                    res.json({message: 'Password updated successfully'});
                });
            });
        });
        if (!req.body.password || !req.body.newPassword) {
            return res.status(400).json({message: 'Both current password and new password are required'});
        }
   });
}

function deleteUserbyID(req, res) {
    const userId = req.params.id;
    const dbQuery = 'DELETE FROM tbl_user WHERE user_id = ?';
    connection.query(dbQuery, [userId], (err, results) => {
        if (err) {
            logError(res, err, 'userController');
            return;
        }
         if (results.affectedRows === 0) {
            return res.status(404).json({message: 'User not found'});
        }
        res.json({message: 'User deleted successfully'});
    });
}

module.exports = {
    register,
    login,
    getUserlist,
    getUserbyId,
    updateUser,
    deleteUserbyID
}