
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'visitas.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Obtém a data atual no formato YYYY-MM-DD (Fuso horário de Brasília)
function getDataAtual() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Sao_Paulo'
  });
}

// Lê os dados salvos ou cria um novo registro caso o dia tenha mudado
function lerDados() {
  const hoje = getDataAtual();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const conteudo = fs.readFileSync(DATA_FILE, 'utf8');
      const dados = JSON.parse(conteudo);

      // Se a data salva for igual a hoje, mantém os dados
      if (dados.data === hoje) {
        return dados;
      }
    }
  } catch (erro) {
    console.error('Erro ao ler arquivo de visitas:', erro);
  }

  // Se o arquivo não existir ou o dia virou, zera o contador
  const novoRegistro = {
    data: hoje,
    dispositivos: []
  };
  salvarDados(novoRegistro);
  return novoRegistro;
}

function salvarDados(dados) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dados, null, 2));
  } catch (erro) {
    console.error('Erro ao salvar arquivo de visitas:', erro);
  }
}

// Rota para registrar ou consultar o acesso
app.post('/api/acesso', (req, res) => {
  const { deviceId } = req.body;
  const dados = lerDados();

  // Só contabiliza se o deviceId ainda não acessou hoje
  if (deviceId && !dados.dispositivos.includes(deviceId)) {
    dados.dispositivos.push(deviceId);
    salvarDados(dados);
  }

  res.json({
    data: dados.data,
    totalHoje: dados.dispositivos.length
  });
});

// Rota GET simples caso queira apenas consultar o número atual
app.get('/api/status', (req, res) => {
  const dados = lerDados();
  res.json({
    data: dados.data,
    totalHoje: dados.dispositivos.length
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});