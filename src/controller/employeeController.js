const connection = require('../../config/config');
const logError = require('../utils/log_helper');

function getEmployees(req, res) {
    const dbQuery = 'SELECT employee.EmpCode, employee.EmpName, employee.Gender, department.DepartmentName, position.PositionName, office.OfficeName, division.DivisionName, branch.BranchName FROM employee LEFT JOIN department ON employee.DepartmentID = department.DeptID LEFT JOIN position ON employee.PositionID = position.PostID LEFT JOIN office ON employee.OfficeID = office.OfficeID LEFT JOIN division ON employee.DivisionID = division.DivisionID LEFT JOIN branch ON employee.BranchID = branch.BranchID;';
    connection.query(dbQuery, (err, results) => {
        if (err) {
            logError(res, err, 'employeeController');
            return;
        }
        res.json(results);
    });
}

function getEmployeeById(req, res) {
    const empCode = req.params.empCode;
    const dbQuery = 'SELECT employee.EmpCode, employee.EmpName, employee.Gender, department.DepartmentName, position.PositionName, office.OfficeName, division.DivisionName, branch.BranchName FROM employee LEFT JOIN department ON employee.DepartmentID = department.DeptID LEFT JOIN position ON employee.PositionID = position.PostID LEFT JOIN office ON employee.OfficeID = office.OfficeID LEFT JOIN division ON employee.DivisionID = division.DivisionID LEFT JOIN branch ON employee.BranchID = branch.BranchID WHERE employee.EmpCode = ?';
    connection.query(dbQuery, [empCode], (err, results) => {
        if (err) {
            logError(res, err, 'employeeController');
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ error: 'Employee not found' });
            return;
        }
        res.json(results[0]);
    });
}

function createEmployee(req, res) {
    const { EmpCode, EmpName, Gender, DepartmentID, PositionID, OfficeID, DivisionID, BranchID } = req.body;
    const dbQuery = 'INSERT INTO employee (EmpCode, EmpName, Gender, DepartmentID, PositionID, OfficeID, DivisionID, BranchID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    connection.query(dbQuery, [EmpCode, EmpName, Gender, DepartmentID, PositionID, OfficeID, DivisionID, BranchID], (err, results) => {
        if (err) {
            logError(res, err, 'employeeController');
            return;
        }
        res.status(201).json({ message: 'Employee created successfully' });
    });
}

function updateEmployee(req, res) {
    const empCode = req.params.empCode;
    const fields = req.body;

    if (Object.keys(fields).length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
    }

    const allowedFields = [
        'EmpName',
        'Gender',
        'DepartmentID',
        'PositionID',
        'OfficeID',
        'DivisionID',
        'BranchID'
    ];

    const filtered = {};

    for (let key in fields) {
        if (allowedFields.includes(key)) {
            filtered[key] = fields[key];
        }
    }

    if (Object.keys(filtered).length === 0) {
        return res.status(400).json({ message: 'No valid fields to update' });
    }

    const keys = Object.keys(filtered);
    const values = Object.values(filtered);

    const setClause = keys.map(key => `${key} = ?`).join(', ');

    const dbQuery = `
        UPDATE employee
        SET ${setClause}
        WHERE EmpCode = ?
    `;

    connection.query(dbQuery, [...values, empCode], (err, results) => {
        if (err) {
            logError(res, err, 'employeeController');
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        return res.status(200).json({ message: 'Employee updated successfully' });
    });
}

function deleteEmployee(req, res) {
    const empCode = req.params.empCode;
    const dbQuery = 'DELETE FROM employee WHERE EmpCode = ?';
    connection.query(dbQuery, [empCode], (err, results) => {
        if (err) {
            logError(res, err, 'employeeController');
            return;
        }
        res.status(200).json({message: 'Employee deleted successfully'});
    });
}

function dashboard(req, res) {
    const dbQuery = 'SELECT (SELECT COUNT(*) FROM position) AS totalPositions, (SELECT COUNT(*) FROM department) AS totalDepartments, (SELECT COUNT(*) FROM office) AS totalOffices, (SELECT COUNT(*) FROM division) AS totalDivisions, (SELECT COUNT(*) FROM branch) AS totalBranches;';
    connection.query(dbQuery, (err, results) => {
        if (err) {
            logError(res, err, 'employeeController');
            return;
        }
        res.json({ totalEmployees: results[0].totalEmployees, totalDepartments: results[0].totalDepartments, totalPositions: results[0].totalPositions, totalOffices: results[0].totalOffices, totalDivisions: results[0].totalDivisions, totalBranches: results[0].totalBranches });
    });
}

module.exports = {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    dashboard
}
