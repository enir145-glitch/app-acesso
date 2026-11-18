const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =========================================================================
// CONFIGURAÇÃO DO BANCO DE DADOS MONGODB
// =========================================================================
// Opção 1: Se for usar variável de ambiente no Render (Recomendado) -> process.env.DATABASE_URL
// Opção 2: Cole sua string de conexão diretamente aqui entre aspas caso queira testar localmente.
// Exemplo de link: "mongodb+srv://seu_usuario:sua_senha@cluster.mongodb.net/contador?retryWrites=true&w=majority"
const MONGO_URI = process.env.DATABASE_URL || "mongodb://admin:XaXdXmXiXnX1X2X3X@ac-qzcmvct-shard-00-00.m7g5y19.mongodb.net:27017,ac-qzcmvct-shard-00-01.m7g5y19.mongodb.net:27017,ac-qzcmvct-shard-00-02.m7g5y19.mongodb.net:27017/?ssl=true&replicaSet=atlas-11rch6-shard-0&authSource=admin";

// Conectando ao MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch((erro) => console.error('Erro ao conectar no MongoDB:', erro));

// Definindo o modelo de dados para os acessos diários
const visitaSchema = new mongoose.Schema({
  data: { type: String, required: true, unique: true }, // Ex: "2026-11-18"
  dispositivos: { type: [String], default: [] }         // Lista de IDs únicos que acessaram no dia
});

const Visita = mongoose.model('Visita', visitaSchema);

// Obtém a data atual no formato YYYY-MM-DD (Fuso horário de Brasília)
function getDataAtual() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Sao_Paulo'
  });
}

// Função auxiliar para buscar ou criar o documento do dia atual no banco
async function obterOuCriarRegistroHoje() {
  const hoje = getDataAtual();
  
  let registro = await Visita.findOne({ data: hoje });
  
  // Se o documento de hoje ainda não existe no banco, ele cria um novo zerado
  if (!registro) {
    registro = new Date(); // apenas para garantir criação limpa se necessário
    try {
      registro = await Visita.create({ data: hoje, dispositivos: [] });
    } catch (e) {
      // Caso haja concorrência de requisições no exato momento da virada, busca novamente
      registro = await Visita.findOne({ data: hoje });
    }
  }
  
  return registro;
}

// =========================================================================
// ROTAS DA API
// =========================================================================

// Rota para registrar acesso do dispositivo
app.post('/api/acesso', async (req, res) => {
  try {
    const { deviceId } = req.body;
    const registroHoje = await obterOuCriarRegistroHoje();

    // Se o dispositivo foi informado e ainda não está registrado hoje
    if (deviceId && !registroHoje.dispositivos.includes(deviceId)) {
      registroHoje.dispositivos.push(deviceId);
      await registroHoje.save(); // Salva a atualização no MongoDB
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

// Rota para apenas consultar o status atual
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
