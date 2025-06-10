const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    salvarDados: (dados) => ipcRenderer.invoke('salvar-dados', dados),
    
    carregarDados: () => ipcRenderer.invoke('carregar-dados'),
    
    exportarCSV: (csvContent, nomeArquivo) => ipcRenderer.invoke('exportar-csv', csvContent, nomeArquivo),
    
    importarDados: () => ipcRenderer.invoke('importar-dados'),
    
    obterInfoArquivo: () => ipcRenderer.invoke('obter-info-arquivo'),
    
    onDadosCarregados: (callback) => ipcRenderer.on('dados-carregados', callback),
    onDadosSalvos: (callback) => ipcRenderer.on('dados-salvos', callback),
    onAppClosing: (callback) => ipcRenderer.on('app-closing', callback),
    
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});