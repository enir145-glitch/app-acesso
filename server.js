const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Sua string de conexão (via Render ou colada aqui para testes)
const MONGO_URI = process.env.DATABASE_URL || "mongodb+srv://contador:contador123@cluster0.m7g5y19.mongodb.net/";

// 2. Conectando ao MongoDB com bufferCommands desativado para falhar rápido se houver erro
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
  bufferCommands: false // Impede que o Mongoose fique guardando comandos se o banco estiver desconectado
})
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch((erro) => console.error('Erro fatal ao conectar no MongoDB:', erro));

// Definindo o modelo
const visitaSchema = new mongoose.Schema({
  data: { type: String, required: true, unique: true },
  dispositivos: { type: [String], default: [] }
});

const Visita = mongoose.model('Visita', visitaSchema);

function getDataAtual() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Sao_Paulo'
  });
}

async function obterOuCriarRegistroHoje() {
  const hoje = getDataAtual();
  
  // Garante que o banco está conectado antes de buscar
  if (mongoose.connection.readyState !== 1) {
    throw new Error('O banco de dados ainda não está conectado.');
  }

  let registro = await Visita.findOne({ data: hoje });
  
  if (!registro) {
    try {
      registro = await Visita.create({ data: hoje, dispositivos: [] });
    } catch (e) {
      registro = await Visita.findOne({ data: hoje });
    }
  }
  
  return registro;
}

// Rotas da API continuam iguais...
app.post('/api/acesso', async (req, res) => {
  try {
    const { deviceId } = req.body;
    const registroHoje = await obterOuCriarRegistroHoje();

    if (deviceId && !registroHoje.dispositivos.includes(deviceId)) {
      registroHoje.dispositivos.push(deviceId);
      await registroHoje.save();
    }

    res.json({
      data: registroHoje.data,
      totalHoje: registroHoje.dispositivos.length
    });
  } catch (erro) {
    console.error('Erro ao registrar acesso:', erro);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

app.get('/api/status', async (req, res) => {
  try {
    const registroHoje = await obterOuCriarRegistroHoje();
    res.json({
      data: registroHoje.data,
      totalHoje: registroHoje.dispositivos.length
    });
  } catch (erro) {
    console.error('Erro ao buscar status:', erro);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
