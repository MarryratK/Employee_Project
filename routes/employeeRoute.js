const employee = require('../src/controller/employeeController');
const authenticateToken = require('../middleware/middleware');
function employeeRoute(app) {
    app.get('/route/api/employees/dashboard', authenticateToken, employee.dashboard);
    app.get('/route/api/employees/list', authenticateToken, employee.getEmployees);
    app.get('/route/api/employees/:empCode', authenticateToken, employee.getEmployeeById);
    app.post('/route/api/employees/create', authenticateToken, employee.createEmployee);
    app.put('/route/api/employees/update/:empCode', authenticateToken, employee.updateEmployee);
    app.delete('/route/api/employees/delete/:empCode', authenticateToken, employee.deleteEmployee);
}

module.exports = employeeRoute;

// this is my employee route, I will use it in the index.js to register the routes for employee related endpoints.
// let test it in postman first