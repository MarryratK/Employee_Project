const user = require('../src/controller/userController');
const authenticateToken = require('../middleware/middleware');

function userRoute(app) {
    app.post('/api/users/register', user.register);
    app.post('/api/users/login', user.login);
    app.get('/api/users/list', user.getUserlist);
    app.get('/api/users/:id', user.getUserbyId);
    app.put('/api/users/update/:id', user.updateUser);
    app.delete('/api/users/delete/:id', user.deleteUserbyID);
}

module.exports = userRoute;