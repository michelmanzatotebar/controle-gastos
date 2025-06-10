
let gastosPorMes = {};
let mesAtual = '2025-06';
let isDesktopApp = typeof window !== 'undefined' && window.electronAPI;

let gastoSendoEditado = null;

const nomesMeses = {
    '2025-01': 'Janeiro 2025',
    '2025-02': 'Fevereiro 2025', 
    '2025-03': 'Março 2025',
    '2025-04': 'Abril 2025',
    '2025-05': 'Maio 2025',
    '2025-06': 'Junho 2025',
    '2025-07': 'Julho 2025',
    '2025-08': 'Agosto 2025',
    '2025-09': 'Setembro 2025',
    '2025-10': 'Outubro 2025',
    '2025-11': 'Novembro 2025',
    '2025-12': 'Dezembro 2025'
};

function formatMoney(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function getGastosAtual() {
    if (!gastosPorMes[mesAtual]) {
        gastosPorMes[mesAtual] = [];
    }
    return gastosPorMes[mesAtual];
}

async function salvarDados() {
    try {
        const dados = {
            gastosPorMes: gastosPorMes || {},
            mesAtual: mesAtual || '2025-06',
            ultimaAtualizacao: new Date().toISOString(),
            versao: '1.0'
        };
        
        if (isDesktopApp) {
            try {
                await window.electronAPI.salvarDados(dados);
                console.log('💾 Dados salvos automaticamente no arquivo!');
                return true;
            } catch (error) {
                console.error('❌ Erro ao salvar dados:', error);
                return false;
            }
        } else {
            salvarNoComputador();
            return true;
        }
    } catch (error) {
        console.error('❌ Erro geral ao salvar:', error);
        return false;
    }
}

async function carregarDados() {
    if (isDesktopApp) {
        
        try {
            const dados = await window.electronAPI.carregarDados();
            if (dados && dados.gastosPorMes) {
                gastosPorMes = dados.gastosPorMes;
                if (dados.mesAtual) {
                    mesAtual = dados.mesAtual;
                }
                console.log('✅ Dados carregados do arquivo!');
                return true;
            }
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
        }
    }
    return false;
}

function salvarNoComputador() {
    const dados = {
        gastosPorMes: gastosPorMes,
        mesAtual: mesAtual,
        ultimaAtualizacao: new Date().toISOString(),
        versao: '1.0'
    };
    
    const dataAtual = new Date().toISOString().split('T')[0];
    const nomeArquivo = `controle_gastos_${dataAtual}.json`;
    
    const blob = new Blob([JSON.stringify(dados, null, 2)], {
        type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`Dados salvos em: ${nomeArquivo}`);
}

function carregarDoArquivo(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (dados.gastosPorMes) {
                gastosPorMes = dados.gastosPorMes;
                if (dados.mesAtual) {
                    mesAtual = dados.mesAtual;
                }
                changeMes(mesAtual);
                salvarDados();
                alert('✅ Dados carregados com sucesso do arquivo!');
                console.log('Dados carregados:', dados);
            } else {
                throw new Error('Formato de arquivo inválido');
            }
        } catch (error) {
            alert('❌ Erro ao carregar arquivo. Verifique se é um arquivo válido do controle de gastos.');
            console.error('Erro:', error);
        }
    };
    reader.readAsText(file);
}

async function exportarParaExcel() {
    let csvContent = "Mês,Descrição,Categoria,Valor,Status,Data\n";
    
    Object.entries(gastosPorMes).forEach(([mes, gastos]) => {
        gastos.forEach(gasto => {
            const linha = `"${nomesMeses[mes]}","${gasto.descricao}","${gasto.categoria}",${gasto.valor},"${gasto.status}","${gasto.data || mes}"\n`;
            csvContent += linha;
        });
    });
    
    const dataAtual = new Date().toISOString().split('T')[0];
    const nomeArquivo = `gastos_planilha_${dataAtual}.csv`;
    
    if (isDesktopApp) {
        
        try {
            const resultado = await window.electronAPI.exportarCSV(csvContent, nomeArquivo);
            if (resultado.sucesso && !resultado.cancelado) {
                alert(`✅ Planilha exportada: ${resultado.caminho}`);
            }
        } catch (error) {
            alert('❌ Erro ao exportar planilha');
            console.error(error);
        }
    } else {
    
        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`✅ Planilha exportada: ${nomeArquivo}`);
    }
}

function updateSummary() {
    const gastos = getGastosAtual();
    const totals = gastos.reduce((acc, gasto) => {
        acc[gasto.status.toLowerCase()] += gasto.valor;
        acc.total += gasto.valor;
        return acc;
    }, { pago: 0, pendente: 0, previsto: 0, total: 0 });
    
    document.getElementById('totalPago').textContent = formatMoney(totals.pago);
    document.getElementById('totalPendente').textContent = formatMoney(totals.pendente);
    document.getElementById('totalPrevisto').textContent = formatMoney(totals.previsto);
    document.getElementById('totalGeral').textContent = formatMoney(totals.total);
}

function updateCategories() {
    const gastos = getGastosAtual();
    const categories = gastos.reduce((acc, gasto) => {
        acc[gasto.categoria] = (acc[gasto.categoria] || 0) + gasto.valor;
        return acc;
    }, {});
    
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';
    
    if (Object.keys(categories).length === 0) {
        grid.innerHTML = '<div class="empty-state"><h4>Nenhuma categoria ainda</h4><p>Adicione gastos para ver as categorias</p></div>';
        return;
    }
    
    Object.entries(categories).forEach(([categoria, valor]) => {
        const gastosDaCategoria = gastos.filter(g => g.categoria === categoria);
        const card = document.createElement('div');
        card.className = 'category-card clickable';
        card.onclick = () => mostrarGastosDaCategoria(categoria, gastosDaCategoria);
        card.innerHTML = `
            <div class="category-name">${categoria}</div>
            <div class="category-value">${formatMoney(valor)}</div>
            <div class="category-count">${gastosDaCategoria.length} ${gastosDaCategoria.length === 1 ? 'gasto' : 'gastos'}</div>
        `;
        grid.appendChild(card);
    });
}

function renderGastos() {
    const list = document.getElementById('gastosList');
    list.innerHTML = '<div class="empty-state"><h4>👆 Clique em uma categoria acima</h4><p>Para ver os gastos organizados por categoria</p></div>';
}

function mostrarGastosDaCategoria(categoria, gastosDaCategoria) {
    const list = document.getElementById('gastosList');
    
    let html = `
        <div class="category-header">
            <h3>📁 ${categoria}</h3>
            <span class="category-total">${formatMoney(gastosDaCategoria.reduce((sum, g) => sum + g.valor, 0))}</span>
            <button class="btn-close-category" onclick="fecharListaCategoria()" title="Fechar lista">×</button>
        </div>
    `;
    
    if (gastosDaCategoria.length === 0) {
        html += '<div class="empty-state"><h4>Nenhum gasto nesta categoria</h4></div>';
    } else {
        gastosDaCategoria.forEach((gasto, indexOriginal) => {
            const gastos = getGastosAtual();
            const realIndex = gastos.findIndex(g => 
                g.descricao === gasto.descricao && 
                g.valor === gasto.valor && 
                g.categoria === gasto.categoria &&
                g.status === gasto.status &&
                g.data === gasto.data
            );
            
            html += `
                <div class="gasto-item">
                    <div class="gasto-info">
                        <div class="gasto-desc">${gasto.descricao}</div>
                        <div class="gasto-date">${formatarData(gasto.data)}</div>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <div class="gasto-valor">${formatMoney(gasto.valor)}</div>
                        <span class="gasto-status ${gasto.status.toLowerCase()}">${gasto.status}</span>
                        <button class="btn-edit" onclick="editarGasto(${realIndex})" title="Editar gasto">✏️</button>
                        <button class="btn-remove" onclick="removeGasto(${realIndex})" title="Remover gasto">×</button>
                    </div>
                </div>
            `;
        });
    }
    
    list.innerHTML = html;
}

function fecharListaCategoria() {
    renderGastos(); 
}

function formatarData(dataString) {
    if (!dataString) return 'Data não informada';
    
    try {
        const data = new Date(dataString + 'T00:00:00');
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    } catch (error) {
        return 'Data inválida';
    }
}

function addGasto(gastoData) {
    if (!gastosPorMes[mesAtual]) {
        gastosPorMes[mesAtual] = [];
    }
    
    gastosPorMes[mesAtual].push(gastoData);
    salvarDados();
    
    updateSummary();
    updateCategories();
    
    mostrarNotificacao(`✅ Gasto "${gastoData.descricao}" adicionado!`, 'sucesso');
  
    const categoryHeader = document.querySelector('.category-header');
    if (categoryHeader) {
        const categoriaAtual = categoryHeader.querySelector('h3').textContent.replace('📁 ', '');
        if (categoriaAtual === gastoData.categoria) {
            const gastos = getGastosAtual();
            const gastosDaCategoria = gastos.filter(g => g.categoria === gastoData.categoria);
            mostrarGastosDaCategoria(gastoData.categoria, gastosDaCategoria);
        }
    } else {
        renderGastos();
    }
}

function editarGasto(index) {
    const gastos = getGastosAtual();
    const gasto = gastos[index];
    
    if (!gasto) {
        alert('Gasto não encontrado!');
        return;
    }
    
    gastoSendoEditado = index;
    
    document.getElementById('editDescricao').value = gasto.descricao;
    document.getElementById('editValor').value = gasto.valor;
    document.getElementById('editCategoria').value = gasto.categoria;
    document.getElementById('editStatus').value = gasto.status;
    
    document.getElementById('editModal').style.display = 'block';
    
    setTimeout(() => {
        document.getElementById('editDescricao').focus();
    }, 100);
}

function fecharModalEdicao() {
    document.getElementById('editModal').style.display = 'none';
    gastoSendoEditado = null;
    
    document.getElementById('editForm').reset();
}

function salvarEdicao(dadosEditados) {
    if (gastoSendoEditado === null) {
        alert('Erro: Nenhum gasto selecionado para edição');
        return;
    }
    
    const gastos = getGastosAtual();
    
    if (gastoSendoEditado >= gastos.length) {
        alert('Erro: Gasto não encontrado');
        return;
    }
    
    const gastoOriginal = {...gastos[gastoSendoEditado]};
    
    gastos[gastoSendoEditado] = {
        ...gastos[gastoSendoEditado],
        ...dadosEditados,
        dataEdicao: new Date().toISOString().split('T')[0]
    };
    
    salvarDados();
    
    updateSummary();
    updateCategories();
    
    const categoryHeader = document.querySelector('.category-header');
    if (categoryHeader) {
        const novaCategoria = dadosEditados.categoria;
        const gastosNovaCategoreia = gastos.filter(g => g.categoria === novaCategoria);
        mostrarGastosDaCategoria(novaCategoria, gastosNovaCategoreia);
    } else {
        renderGastos();
    }
    
    fecharModalEdicao();
    
    mostrarNotificacao('✅ Gasto editado com sucesso!', 'sucesso');
}

function removeGasto(index) {
    if (confirm('Tem certeza que deseja remover este gasto?')) {
        const gastos = getGastosAtual();
        const gastoRemovido = gastos[index];
        
        gastos.splice(index, 1);
        salvarDados(); 
        
        updateSummary();
        updateCategories();
        
        const categoryHeader = document.querySelector('.category-header');
        if (categoryHeader && gastoRemovido) {
            const categoria = gastoRemovido.categoria;
            const gastosRestantes = gastos.filter(g => g.categoria === categoria);
            mostrarGastosDaCategoria(categoria, gastosRestantes);
        } else {
            renderGastos();
        }
        
        mostrarNotificacao('🗑️ Gasto removido com sucesso!', 'sucesso');
    }
}

function changeMes(novoMes) {
    mesAtual = novoMes;
    salvarDados(); 
    
    document.getElementById('currentMonth').textContent = nomesMeses[mesAtual];
    document.getElementById('monthDescription').textContent = `${nomesMeses[mesAtual]} - Organize suas finanças`;
    
    renderGastos();
    updateSummary();
    updateCategories();
}

function mostrarNotificacao(mensagem, tipo = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${tipo}`;
    notification.textContent = mensagem;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${tipo === 'sucesso' ? '#27ae60' : tipo === 'erro' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 8px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function mostrarInfoArquivo(info) {
    const infoDiv = document.createElement('div');
    infoDiv.innerHTML = `
        <div style="background: #e8f5e8; padding: 10px; border-radius: 8px; margin: 10px 0; font-size: 0.9em;">
            <strong>📁 Arquivo de dados:</strong><br>
            <code style="background: #fff; padding: 2px 6px; border-radius: 4px;">${info.nome}</code><br>
            <small style="color: #666;">Localização: ${info.caminho}</small>
        </div>
    `;
    
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.insertBefore(infoDiv, formSection.firstChild);
    }
}

function adicionarBotoesArquivo() {
    const container = document.querySelector('.form-section');
    if (!container) return;
    
    const botoesDiv = document.createElement('div');
    
    if (isDesktopApp) {
        botoesDiv.innerHTML = `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #dee2e6;">
                <h4 style="color: #2c3e50; margin-bottom: 15px; text-align: center;">💾 Gerenciar Dados</h4>
                
                <div class="buttons-grid">
                    <button type="button" onclick="salvarDados()" class="btn-compact btn-save">
                        💾 Salvar
                    </button>
                    
                    <button type="button" onclick="exportarParaExcel()" class="btn-compact btn-export">
                        📊 Excel
                    </button>
                    
                    <button type="button" onclick="importarDadosDesktop()" class="btn-compact btn-import">
                        📂 Importar
                    </button>
                    
                    <button type="button" onclick="limparTodosDados()" class="btn-compact btn-delete">
                        🗑️ Limpar
                    </button>
                </div>
            </div>
        `;
    } else {
        botoesDiv.innerHTML = `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #dee2e6;">
                <h4 style="color: #2c3e50; margin-bottom: 15px; text-align: center;">💾 Gerenciar Arquivos</h4>
                
                <div class="buttons-grid">
                    <button type="button" onclick="salvarNoComputador()" class="btn-compact btn-save">
                        💾 Salvar
                    </button>
                    
                    <button type="button" onclick="exportarParaExcel()" class="btn-compact btn-export">
                        📊 Excel
                    </button>
                    
                    <button type="button" onclick="document.getElementById('fileInput').click()" class="btn-compact btn-import">
                        📂 Importar
                    </button>
                    
                    <button type="button" onclick="limparTodosDados()" class="btn-compact btn-delete">
                        🗑️ Limpar
                    </button>
                </div>
                
                <input type="file" id="fileInput" accept=".json" style="display: none;" onchange="handleFileLoad(this)">
            </div>
        `;
    }
    
    container.appendChild(botoesDiv);
}

async function importarDadosDesktop() {
    if (isDesktopApp) {
        try {
            const resultado = await window.electronAPI.importarDados();
            if (resultado.sucesso && !resultado.cancelado) {
                gastosPorMes = resultado.dados.gastosPorMes || {};
                if (resultado.dados.mesAtual) {
                    mesAtual = resultado.dados.mesAtual;
                }
                changeMes(mesAtual);
                mostrarNotificacao('✅ Dados importados com sucesso!', 'sucesso');
            }
        } catch (error) {
            mostrarNotificacao('❌ Erro ao importar dados', 'erro');
            console.error(error);
        }
    }
}

function handleFileLoad(input) {
    const file = input.files[0];
    if (file) {
        carregarDoArquivo(file);
        input.value = ''; 
    }
}

function limparTodosDados() {
    if (confirm('⚠️ ATENÇÃO: Isso irá apagar TODOS os seus dados de TODOS os meses!\n\nTem certeza que deseja continuar?')) {
        if (confirm('Última chance! Seus dados serão perdidos permanentemente. Continuar?')) {
            try {
                
                gastosPorMes = {};
                
                renderGastos();
                updateSummary();
                updateCategories();
                
                setTimeout(async () => {
                    try {
                        await salvarDados();
                        mostrarNotificacao('🗑️ Todos os dados foram removidos', 'sucesso');
                        console.log('✅ Dados limpos com sucesso');
                    } catch (error) {
                        console.error('❌ Erro ao salvar estado vazio:', error);
                        mostrarNotificacao('⚠️ Dados removidos, mas erro ao salvar', 'erro');
                    }
                }, 100);
                
            } catch (error) {
                console.error('❌ Erro ao limpar dados:', error);
                mostrarNotificacao('❌ Erro ao limpar dados', 'erro');
            }
        }
    }
}

function getEstatisticas() {
    const estatisticas = {
        totalMeses: Object.keys(gastosPorMes).length,
        totalGastos: 0,
        mediaGastosMes: 0,
        categoriasMaisUsadas: {},
        mesComMaisGastos: null,
        valorMesComMaisGastos: 0
    };
    
    Object.entries(gastosPorMes).forEach(([mes, gastos]) => {
        const totalMes = gastos.reduce((sum, gasto) => sum + gasto.valor, 0);
        estatisticas.totalGastos += totalMes;
        
        if (totalMes > estatisticas.valorMesComMaisGastos) {
            estatisticas.valorMesComMaisGastos = totalMes;
            estatisticas.mesComMaisGastos = mes;
        }
        
        gastos.forEach(gasto => {
            estatisticas.categoriasMaisUsadas[gasto.categoria] = 
                (estatisticas.categoriasMaisUsadas[gasto.categoria] || 0) + 1;
        });
    });
    
    if (estatisticas.totalMeses > 0) {
        estatisticas.mediaGastosMes = estatisticas.totalGastos / estatisticas.totalMeses;
    }
    
    return estatisticas;
}


document.addEventListener('DOMContentLoaded', async function() {
   
    if (isDesktopApp) {
        console.log('🖥️ Aplicação Desktop detectada!');
        
      
        window.electronAPI.onDadosCarregados((event, dados) => {
            if (dados && dados.gastosPorMes) {
                gastosPorMes = dados.gastosPorMes;
                if (dados.mesAtual) {
                    mesAtual = dados.mesAtual;
                }
                changeMes(mesAtual);
            }
        });

        window.electronAPI.onDadosSalvos((event, resultado) => {
            if (resultado.sucesso) {
                mostrarNotificacao(`💾 Salvo: ${resultado.hora}`, 'sucesso');
            } else {
                mostrarNotificacao('❌ Erro ao salvar', 'erro');
            }
        });

        window.electronAPI.onAppClosing(() => {
            salvarDados();
        });

        await carregarDados();
        
        try {
            const info = await window.electronAPI.obterInfoArquivo();
            mostrarInfoArquivo(info);
        } catch (error) {
            console.error('Erro ao obter info do arquivo:', error);
        }
    } else {
        console.log('🌐 Versão Web detectada');
    }
    
    const monthSelect = document.getElementById('monthSelect');
    monthSelect.value = mesAtual;
    
    monthSelect.addEventListener('change', function(e) {
        changeMes(e.target.value);
    });
    
    document.getElementById('gastoForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const gasto = {
            descricao: document.getElementById('descricao').value.trim(),
            valor: parseFloat(document.getElementById('valor').value),
            categoria: document.getElementById('categoria').value,
            status: document.getElementById('status').value,
            data: new Date().toISOString().split('T')[0] 
        };
        
        if (!gasto.descricao) {
            alert('Por favor, insira uma descrição para o gasto.');
            return;
        }
        
        if (isNaN(gasto.valor) || gasto.valor <= 0) {
            alert('Por favor, insira um valor válido maior que zero.');
            return;
        }
        
        if (!gasto.categoria) {
            alert('Por favor, selecione uma categoria.');
            return;
        }
        
        addGasto(gasto);
        
        this.reset();
        
        document.getElementById('descricao').focus();
    });
    
    document.getElementById('editForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const gastoEditado = {
            descricao: document.getElementById('editDescricao').value.trim(),
            valor: parseFloat(document.getElementById('editValor').value),
            categoria: document.getElementById('editCategoria').value,
            status: document.getElementById('editStatus').value
        };
        
        if (!gastoEditado.descricao) {
            alert('Por favor, insira uma descrição para o gasto.');
            return;
        }
        
        if (isNaN(gastoEditado.valor) || gastoEditado.valor <= 0) {
            alert('Por favor, insira um valor válido maior que zero.');
            return;
        }
        
        if (!gastoEditado.categoria) {
            alert('Por favor, selecione uma categoria.');
            return;
        }
        
        salvarEdicao(gastoEditado);
    });
    
    document.getElementById('editModal').addEventListener('click', function(e) {
        if (e.target === this) {
            fecharModalEdicao();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('editModal').style.display === 'block') {
            fecharModalEdicao();
        }
    });
    
    adicionarBotoesArquivo();
    
    changeMes(mesAtual);
    
    if (!isDesktopApp) {
        setInterval(() => {
            const totalGastos = Object.values(gastosPorMes).reduce((total, gastos) => total + gastos.length, 0);
            if (totalGastos > 0) {
                salvarNoComputador();
            }
        }, 300000);
    }
});