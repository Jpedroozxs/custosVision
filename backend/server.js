const express = require('express');
const cors = require('cors');
const { testarConexao } = require('./config/db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());

app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', projeto: 'Custus Vision' }));

app.use('/api/usuarios', require('./routes/usuarioRoutes'));

app.use('/api/categorias', require('./routes/categoriaRoutes'));

app.use('/api/rendas', require('./routes/rendaRoutes'));

app.use('/api/despesas', require('./routes/despesaRoutes'));

app.use('/api/metas', require('./routes/metaRoutes'));

app.use('/api/aportes-meta', require('./routes/aporteMetaRoutes'));

app.use('/api/cpf', require('./routes/cpfRoutes'));

app.use('/api/email', require('./routes/emailRoutes'));

app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));


async function iniciar() {
  try { await testarConexao(); }
  catch (error) { console.error('Não foi possível conectar ao MySQL:', error.message); }

  app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
}

iniciar();
