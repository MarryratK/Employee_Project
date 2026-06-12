var express = require('express');
var app = express();
app.use(express.json());
require('dotenv').config();
// var managerRoute = require('./src/managerRoute');
//var postionRoute = require('./src/positionRoute');
var employeeRoute = require('./routes/employeeRoute');
var userRoute = require('./routes/userRoute');
var startLogCleaner = require('./src/utils/log_cleaner');
var cors = require('cors');
app.use(cors());
// managerRoute(app);
//positionRoute(app);
employeeRoute(app);
userRoute(app);
startLogCleaner();

// var employees = [
//     {name: 'Marryrat', role: 'Backend Developer'},
//     {name: 'John Doe', role: 'Software Engineer'},
//     {name: 'Jane Smith', role: 'Product Manager'}   
// ];

app.get('/', function (req, res) {
  res.send('This is Marryrat');
});

app.get('/dev', function (req, res){
    res.send('Development environment');
});

// app.get('/api/production', function (req, res){
//     res.send({
//         employees: employees
//     });
// });

app.listen(3333, function () {
    console.log('localhost:3333');
});

// hello teacher this is my homework 