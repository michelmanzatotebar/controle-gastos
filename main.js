const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

app.disableHardwareAcceleration();

const DADOS_DIR = path.join(os.homedir(), 'ControleGastos');
const DADOS_FILE = path.join(DADOS_DIR, 'dados_gastos.json');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
            experimentalFeatures: false
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        show: false,
        titleBarStyle: 'default',
        backgroundColor: '#ffffff'
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('🚀 Aplicação iniciada com sucesso!');
        
        carregarDados();
    });

    mainWindow.on('close', (event) => {
        console.log('💾 Salvando dados antes de fechar...');
        mainWindow.webContents.send('app-closing');
    });

    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

async function garantirPasta() {
    try {
        await fs.mkdir(DADOS_DIR, { recursive: true });
        console.log('📁 Pasta de dados criada/verificada:', DADOS_DIR);
    } catch (error) {
        console.error('❌ Erro ao criar pasta:', error);
    }
}

async function carregarDados() {
    try {
        await garantirPasta();
        
        const data = await fs.readFile(DADOS_FILE, 'utf8');
        const dados = JSON.parse(data);
        
        mainWindow.webContents.send('dados-carregados', dados);
        console.log('✅ Dados carregados do arquivo:', DADOS_FILE);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('📁 Arquivo de dados não existe ainda, será criado automaticamente');
    
            await salvarDados({
                gastosPorMes: {},
                mesAtual: '2025-06',
                ultimaAtualizacao: new Date().toISOString(),
                versao: '1.0'
            });
        } else {
            console.error('❌ Erro ao carregar dados:', error.message);
        }
    }
}

async function salvarDados(dados) {
    try {
        await garantirPasta();
        
        if (!dados) {
            dados = {
                gastosPorMes: {},
                mesAtual: '2025-06',
                ultimaAtualizacao: new Date().toISOString(),
                versao: '1.0'
            };
        }
        
        dados.gastosPorMes = dados.gastosPorMes || {};
        dados.mesAtual = dados.mesAtual || '2025-06';
        dados.ultimaAtualizacao = new Date().toISOString();
        dados.versao = dados.versao || '1.0';
        
        console.log('💾 Tentando salvar em:', DADOS_FILE);
        console.log('📊 Tamanho dos dados:', JSON.stringify(dados).length, 'caracteres');
        
        await fs.writeFile(DADOS_FILE, JSON.stringify(dados, null, 2), 'utf8');
        console.log('✅ Dados salvos com sucesso em:', DADOS_FILE);
        
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('dados-salvos', { 
                sucesso: true, 
                arquivo: DADOS_FILE,
                hora: new Date().toLocaleTimeString('pt-BR')
            });
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erro detalhado ao salvar dados:');
        console.error('   Arquivo:', DADOS_FILE);
        console.error('   Erro:', error.message);
        console.error('   Código:', error.code);
        console.error('   Stack:', error.stack);
        
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('dados-salvos', { 
                sucesso: false, 
                erro: error.message 
            });
        }
        
        return false;
    }
}

app.whenReady().then(() => {
    console.log('🖥️ Electron inicializado');
    createWindow();
});

app.on('window-all-closed', () => {
    console.log('🔒 Fechando aplicação');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.handle('salvar-dados', async (event, dados) => {
    try {
        const sucesso = await salvarDados(dados);
        return { sucesso: sucesso };
    } catch (error) {
        console.error('❌ Erro no handler salvar-dados:', error);
        return { sucesso: false, erro: error.message };
    }
});

ipcMain.handle('carregar-dados', async () => {
    try {
        const data = await fs.readFile(DADOS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            const dadosVazios = {
                gastosPorMes: {},
                mesAtual: '2025-06',
                ultimaAtualizacao: new Date().toISOString(),
                versao: '1.0'
            };
            
            await salvarDados(dadosVazios);
            return dadosVazios;
        }
        console.error('❌ Erro ao carregar dados:', error);
        throw error;
    }
});

ipcMain.handle('exportar-csv', async (event, csvContent, nomeArquivo) => {
    try {
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Salvar planilha de gastos',
            defaultPath: nomeArquivo,
            filters: [
                { name: 'Arquivo CSV', extensions: ['csv'] },
                { name: 'Todos os arquivos', extensions: ['*'] }
            ]
        });

        if (filePath) {
            await fs.writeFile(filePath, csvContent, 'utf8');
            return { sucesso: true, caminho: filePath };
        }
        
        return { sucesso: false, cancelado: true };
    } catch (error) {
        console.error('❌ Erro ao exportar CSV:', error);
        return { sucesso: false, erro: error.message };
    }
});

ipcMain.handle('importar-dados', async () => {
    try {
        const { filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: 'Importar dados de gastos',
            filters: [
                { name: 'Arquivo JSON', extensions: ['json'] },
                { name: 'Todos os arquivos', extensions: ['*'] }
            ],
            properties: ['openFile']
        });

        if (filePaths && filePaths.length > 0) {
            const data = await fs.readFile(filePaths[0], 'utf8');
            const dados = JSON.parse(data);
            
            if (!dados.gastosPorMes) {
                throw new Error('Arquivo não contém dados válidos do controle de gastos');
            }
            
            await salvarDados(dados);
            
            return { sucesso: true, dados };
        }
        
        return { sucesso: false, cancelado: true };
    } catch (error) {
        console.error('❌ Erro ao importar dados:', error);
        return { sucesso: false, erro: error.message };
    }
});

ipcMain.handle('obter-info-arquivo', () => {
    return {
        caminho: DADOS_FILE,
        nome: path.basename(DADOS_FILE)
    };
});

process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada não tratada:', reason);
});