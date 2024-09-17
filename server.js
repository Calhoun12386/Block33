const express = require('express');
const app = express();
const pg = require('pg');
const client = new pg.Client(
  process.env.DATABASE_URL || 'postgres://localhost/acme_hr_directory'
);
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(require('morgan')('dev'));

// GET /api/employees: Returns array of employees
app.get('/api/employees', async (req, res, next) => {
  try {
    const SQL = `SELECT * FROM employees;`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (ex) {
    next(ex);
  }
});

// GET /api/departments: Returns an array of departments
app.get('/api/departments', async (req, res, next) => {
  try {
    const SQL = `SELECT * FROM departments;`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (ex) {
    next(ex);
  }
});

// POST /api/employees: Creates a new employee
app.post('/api/employees', async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const SQL = `
      INSERT INTO employees (name, department_id, created_at, updated_at)
      VALUES ($1, $2, now(), now())
      RETURNING *;
    `;
    const response = await client.query(SQL, [name, department_id]);
    res.send(response.rows[0]);
  } catch (ex) {
    next(ex);
  }
});

// DELETE /api/employees/:id: Deletes an employee
app.delete('/api/employees/:id', async (req, res, next) => {
  try {
    const SQL = `DELETE FROM employees WHERE id = $1;`;
    await client.query(SQL, [req.params.id]);
    res.sendStatus(204);
  } catch (ex) {
    next(ex);
  }
});

// PUT /api/employees/:id: Updates an employee
app.put('/api/employees/:id', async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const SQL = `
      UPDATE employees
      SET name = $1, department_id = $2, updated_at = now()
      WHERE id = $3
      RETURNING *;
    `;
    const response = await client.query(SQL, [name, department_id, req.params.id]);
    res.send(response.rows[0]);
  } catch (ex) {
    next(ex);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: err.message });
});

// Database initialization and seeding
const init = async () => {
  try {
    await client.connect();
    let SQL = `
      DROP TABLE IF EXISTS employees;
      DROP TABLE IF EXISTS departments;

      CREATE TABLE departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100)
      );

      CREATE TABLE employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        department_id INTEGER REFERENCES departments(id) NOT NULL
      );
    `;
    await client.query(SQL);
    console.log('Tables created');

    SQL = `
      INSERT INTO departments (name) VALUES ('Engineering');
      INSERT INTO departments (name) VALUES ('HR');
      INSERT INTO departments (name) VALUES ('Management');
      
      INSERT INTO employees (name, department_id) VALUES ('Nick', (SELECT id FROM departments WHERE name='Engineering'));
      INSERT INTO employees (name, department_id) VALUES ('Doaa', (SELECT id FROM departments WHERE name='HR'));
      INSERT INTO employees (name, department_id) VALUES ('Tom', (SELECT id FROM departments WHERE name='Management'));
    `;
    await client.query(SQL);
    console.log('Data seeded');

    app.listen(port, () => console.log(`Server listening on port ${port}`));
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

init();

//curl GET http://localhost:3000/api/employees
//curl GET http://localhost:3000/api/departments

//curl localhost:3000/api/employees -X POST -d '{"name": "steven john", "department_id": 1}' -H "Content-Type:application/json"
//curl localhost:3000/api/employees/4 -X PUT -d '{"name": "steven calhoun", "department_id": 2}' -H "Content-Type:application/json"
//curl localhost:3000/api/employees/4 -X DELETE