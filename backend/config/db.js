const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const pool = mysql.createPool({
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'CustusVision',
  waitForConnections: true,
  queueLimit: 0
});

async function testarConexao() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    console.log('Banco de dados conectado com sucesso.');
  } finally {
    connection.release();
  }
}

module.exports = { pool, testarConexao };
