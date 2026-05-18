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
    usuario1: { streak: 0 },
    usuario2: { streak: 0 }
};

// Atualiza a interface visual de ambos os atletas simultaneamente
function updateDashboard() {
    const users = ['usuario1', 'usuario2'];

    users.forEach(user => {
        const streak = appData[user].streak;
        
        // Atualiza o texto do streak
        document.getElementById(`streak-${user}`).innerText = `${streak} ${streak === 1 ? 'Dia' : 'Dias'}`;

        // Determina a meta atual do bloco
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

        // Calcula a porcentagem da barra de progresso do bloco atual
        const targetRange = currentTarget.days - previousDays;
        const currentProgress = streak - previousDays;
        const percentage = Math.min((currentProgress / targetRange) * 100, 100);
        document.getElementById(`progress-${user}`).style.width = `${percentage}%`;

        // Atualiza os Badges da Linha do Tempo para este usuário
        targets.forEach(target => {
            const badgeEl = document.getElementById(`badge-${user}-${target.suffix}`);
            if (badgeEl) {
                if (streak >= target.days) {
                    badgeEl.classList.add('completed');
                } else {
                    badgeEl.classList.remove('completed');
                }
            }
        });
    });
}

// Busca os dados iniciais do Google Sheets
async function fetchData() {
    try {
        const response = await fetch(SCRIPT_URL);
        if (response.ok) {
            const data = await response.json();
            appData = data;
            updateDashboard();
        }
    } catch (error) {
        console.error("Erro ao buscar dados do Sheets:", error);
    }
}

// Envia a ação para a API usando Query Parameters (evita problemas de CORS)
async function sendActionToSheets(user, actionType) {
    try {
        const urlComParametros = `${SCRIPT_URL}?user=${user}&action=${actionType}`;

        await fetch(urlComParametros, {
            method: 'GET',
            mode: 'no-cors'
        });

        // Aguarda um pequeno intervalo para o banco processar antes de re-atualizar a tela
        setTimeout(fetchData, 800);
    } catch (error) {
        console.error("Erro ao enviar dados para o Sheets:", error);
    }
}

// Configuração dos Eventos dos Botões (Rafael)
document.getElementById('checkin-usuario1').addEventListener('click', () => {
    appData.usuario1.streak += 1;
    updateDashboard();
    sendActionToSheets('usuario1', 'checkin');
});

document.getElementById('reset-usuario1').addEventListener('click', () => {
    if (confirm("Rafael, tem certeza que deseja zerar seu contador de consistência?")) {
        appData.usuario1.streak = 0;
        updateDashboard();
        sendActionToSheets('usuario1', 'reset');
    }
});

// Configuração dos Eventos dos Botões (Isabelly)
document.getElementById('checkin-usuario2').addEventListener('click', () => {
    appData.usuario2.streak += 1;
    updateDashboard();
    sendActionToSheets('usuario2', 'checkin');
});

document.getElementById('reset-usuario2').addEventListener('click', () => {
    if (confirm("Isabelly, tem certeza que deseja zerar seu contador de consistência?")) {
        appData.usuario2.streak = 0;
        updateDashboard();
        sendActionToSheets('usuario2', 'reset');
    }
});

// Inicialização ao carregar a página
fetchData();


// ============================================================
// ====== LÓGICA DE INSTALAÇÃO DO APLICATIVO (PWA FIX) ========
// ============================================================
let deferredPrompt;
const installBanner = document.getElementById('pwa-install-banner');
const btnPwaInstall = document.getElementById('btn-pwa-install');
const btnPwaClose = document.getElementById('btn-pwa-close');

// Registra o Service Worker (Garante ciclo correto baseado no app de Plantão)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('Service Worker rodando em escopo:', reg.scope);
                // Força atualização em background se o sw.js mudar
                reg.update();
            })
            .catch(err => console.log('Erro ao registrar SW:', err));
    });
}

// Intercepta e aguarda o momento que o navegador aprova os critérios do manifest
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Se o usuário nunca instalou ou fechou recentemente, exibe a barra
    if (installBanner && !localStorage.getItem('pwa-dismissed')) {
        installBanner.style.display = 'flex';
        document.body.classList.add('banner-active');
    }
});

// Botão de Confirmação de Instalação
if (btnPwaInstall) {
    btnPwaInstall.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Escolha do usuário: ${outcome}`);
        
        deferredPrompt = null;
        if (installBanner) {
            installBanner.style.display = 'none';
            document.body.classList.remove('banner-active');
        }
    });
}

// Botão de fechar (Guarda preferência para não ficar irritando o casal em loop)
if (btnPwaClose) {
    btnPwaClose.addEventListener('click', () => {
        if (installBanner) {
            installBanner.style.display = 'none';
            document.body.classList.remove('banner-active');
            // Opcional: Descomente abaixo se não quiser que a barra reapareça na mesma sessão
            // localStorage.setItem('pwa-dismissed', 'true');
        }
    });
}

// Trata fechamento se o app for instalado de outra forma externa (Ex: pelos 3 pontinhos)
window.addEventListener('appinstalled', () => {
    console.log('App instalado com sucesso!');
    if (installBanner) {
        installBanner.style.display = 'none';
        document.body.classList.remove('banner-active');
    }
});