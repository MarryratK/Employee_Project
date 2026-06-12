const mysql = require('mysql2');

const connection = mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'backend-dev',
});

connection.connect((err) => {

    if (err) {
        console.log('Database connection failed');
        console.log(err);
        return;
    }

    console.log('Database connected successfully');
});

module.exports = connection;