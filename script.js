// URL do Web App gerada pelo Google Apps Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwbX3XA_D6F4MkFz88bmY7nsJBaCR44z-YzFEvKMPLmme_yufjZ5eylPMdx5Upmn60B7A/exec";

// Definição dos blocos de metas (em dias)
const targets = [
    { label: '1 Semana', days: 7, suffix: '1w' },
    { label: '2 Semanas', days: 14, suffix: '2w' },
    { label: '1 Mês', days: 30, suffix: '1m' },
    { label: '2 Meses', days: 60, suffix: '2m' },
    { label: '3 Meses', days: 90, suffix: '3m' }
];

// Estado local da aplicação para os usuários
let appData = {
    usuario1: { streak: 0, treinouHoje: false },
    usuario2: { streak: 0, treinouHoje: false }
};

// Atualiza a interface visual de ambos os atletas simultaneamente
function updateDashboard() {
    const users = ['usuario1', 'usuario2'];

    users.forEach(user => {
        const streak = appData[user].streak;
        const treinouHoje = appData[user].treinouHoje;
        const ehUtil = appData[user].util !== undefined ? appData[user].util : true;
        const btnCheckin = document.getElementById(`checkin-${user}`);
        
        document.getElementById(`streak-${user}`).innerText = `${streak} ${streak === 1 ? 'Dia' : 'Dias'}`;

        // CONTROLES VISUAIS DINÂMICOS DO BOTÃO COM VALIDAÇÃO DE DIA ÚTIL
        if (btnCheckin) {
            if (!ehUtil) {
                btnCheckin.innerText = "Academia Fechada (Feriado/FDS)";
                btnCheckin.style.backgroundColor = "#757575"; // Cinza escuro indicando bloqueio
                btnCheckin.disabled = true; // Desativa o clique
            } else if (treinouHoje) {
                btnCheckin.innerText = "Treinado! (Desfazer)";
                btnCheckin.style.backgroundColor = "#2e7d32"; // Verde
                btnCheckin.disabled = false;
            } else {
                btnCheckin.innerText = "Marcar Treino";
                btnCheckin.style.backgroundColor = ""; // Cor padrão
                btnCheckin.disabled = false;
            }
        }

        let currentTarget = targets[targets.length - 1];
        let previousDays = 0;

        for (let target of targets) {
            if (streak < target.days) {
                currentTarget = target;
                break;
            }
            previousDays = target.days;
        }

        document.getElementById(`phase-${user}`).innerText = currentTarget.label;
        const targetRange = currentTarget.days - previousDays;
        const currentProgress = streak - previousDays;
        const percentage = Math.max((currentProgress / targetRange) * 100, 0);
        
        const progressBar = document.getElementById(`progress-${user}`);
        if (progressBar) progressBar.style.width = `${Math.min(percentage, 100)}%`;

        targets.forEach(target => {
            const badgeEl = document.getElementById(`badge-${user}-${target.suffix}`);
            if (badgeEl) {
                if (streak >= target.days) badgeEl.classList.add('completed');
                else badgeEl.classList.remove('completed');
            }
        });
    });
}

// Busca os dados do Google Sheets tratando de forma segura contra travamentos de CORS
// Busca os dados do Google Sheets tratando de forma segura contra travamentos de CORS
async function fetchData() {
    try {
        if (document.getElementById('streak-usuario1')) document.getElementById('streak-usuario1').innerText = "Carregando...";
        if (document.getElementById('streak-usuario2')) document.getElementById('streak-usuario2').innerText = "Carregando...";

        const response = await fetch(SCRIPT_URL);
        if (response.ok) {
            const textData = await response.text();
            const data = JSON.parse(textData);
            
            appData.usuario1.streak = data.usuario1.streak || 0;
            appData.usuario2.streak = data.usuario2.streak || 0;
            
            appData.usuario1.treinouHoje = !!data.usuario1.treinouHoje;
            appData.usuario2.treinouHoje = !!data.usuario2.treinouHoje;
            
            // Grava a informação de dia util recebida do servidor
            appData.usuario1.util = data.usuario1.util;
            appData.usuario2.util = data.usuario2.util;

            updateDashboard();
        }
    } catch (error) {
        console.error("Erro ao buscar dados do Sheets:", error);
        updateDashboard(); 
    }
}

// Envia a ação para a API usando rotas limpas de Query Parameters
async function sendActionToSheets(user, actionType) {
    try {
        const urlComParametros = `${SCRIPT_URL}?user=${user}&action=${actionType}`;

        // O modo 'no-cors' garante que a requisição chegue ao Google sem que o navegador bloqueie o envio
        await fetch(urlComParametros, {
            method: 'GET',
            mode: 'no-cors'
        });

        // Aguarda 1.2 segundos para o banco consolidar e atualiza a tela com o dado real do servidor
        setTimeout(fetchData, 1200);
    } catch (error) {
        console.error("Erro ao enviar dados para o Sheets:", error);
    }
}

// Configuração dos Eventos dos Botões (Rafael)
const btnCheckin1 = document.getElementById('checkin-usuario1');
if (btnCheckin1) {
    btnCheckin1.addEventListener('click', () => {
        appData.usuario1.treinouHoje = !appData.usuario1.treinouHoje;
        
        if (appData.usuario1.treinouHoje) {
            appData.usuario1.streak += 1;
        } else {
            appData.usuario1.streak = Math.max(0, appData.usuario1.streak - 1);
        }
        
        updateDashboard(); 
        sendActionToSheets('usuario1', 'checkin');
    });
}

const btnReset1 = document.getElementById('reset-usuario1');
if (btnReset1) {
    btnReset1.addEventListener('click', () => {
        if (confirm("Rafael, tem certeza que deseja zerar seu contador de consistência?")) {
            appData.usuario1.streak = 0;
            appData.usuario1.treinouHoje = false;
            updateDashboard();
            sendActionToSheets('usuario1', 'reset');
        }
    });
}

// Configuração dos Eventos dos Botões (Isabelly)
const btnCheckin2 = document.getElementById('checkin-usuario2');
if (btnCheckin2) {
    btnCheckin2.addEventListener('click', () => {
        appData.usuario2.treinouHoje = !appData.usuario2.treinouHoje;
        
        if (appData.usuario2.treinouHoje) {
            appData.usuario2.streak += 1;
        } else {
            appData.usuario2.streak = Math.max(0, appData.usuario2.streak - 1);
        }
        
        updateDashboard();
        sendActionToSheets('usuario2', 'checkin');
    });
}

const btnReset2 = document.getElementById('reset-usuario2');
if (btnReset2) {
    btnReset2.addEventListener('click', () => {
        if (confirm("Isabelly, tem certeza que deseja zerar seu contador de consistência?")) {
            appData.usuario2.streak = 0;
            appData.usuario2.treinouHoje = false;
            updateDashboard();
            sendActionToSheets('usuario2', 'reset');
        }
    });
}

// Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});


// ============================================================
// ====== LÓGICA DE INSTALAÇÃO DO APLICATIVO (PWA FIX) ========
// ============================================================
let deferredPrompt;
const installBanner = document.getElementById('pwa-install-banner');
const btnPwaInstall = document.getElementById('btn-pwa-install');
const btnPwaClose = document.getElementById('btn-pwa-close');

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('Service Worker ativo:', reg.scope);
                reg.update();
            })
            .catch(err => console.log('Erro SW:', err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    if (installBanner && !localStorage.getItem('pwa-dismissed')) {
        installBanner.style.display = 'flex';
        document.body.classList.add('banner-active');
    }
});

if (btnPwaInstall) {
    btnPwaInstall.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        deferredPrompt = null;
        if (installBanner) {
            installBanner.style.display = 'none';
            document.body.classList.remove('banner-active');
        }
    });
}

if (btnPwaClose) {
    btnPwaClose.addEventListener('click', () => {
        if (installBanner) {
            installBanner.style.display = 'none';
            document.body.classList.remove('banner-active');
        }
    });
}