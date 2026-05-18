const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwbX3XA_D6F4MkFz88bmY7nsJBaCR44z-YzFEvKMPLmme_yufjZ5eylPMdx5Upmn60B7A/exec";

// Função geradora de metas procedurais idênticas para o casal
function gerarProximaMetaProcedural(streakAtual, nomeUsuario) {
    // Metas base iniciais padrão (Garante a largada do app até 3 meses)
    let metas = [
        { label: '1 Semana', days: 7, suffix: '1w' },
        { label: '2 Semanas', days: 14, suffix: '2w' },
        { label: '1 Mês', days: 30, suffix: '1m' },
        { label: '2 Meses', days: 60, suffix: '2m' },
        { label: '3 Meses', days: 90, suffix: '3m' }
    ];

    // Se o streak passou dos 3 meses (90 dias), começamos a expansão procedural
    let ultimoAlvoDias = 90;
    let contadorFase = 1;

    while (streakAtual >= ultimoAlvoDias) {
        // MUDANÇA AQUI: Usamos "casamento" como semente universal. 
        // Isso garante que o resultado do sorteio seja estritamente IGUAL para os dois.
        let stringSemente = "casamento" + contadorFase;
        let hash = 0;
        for (let i = 0; i < stringSemente.length; i++) {
            hash = stringSemente.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Sorteia o acréscimo: +1 mês (30d), +2 meses (60d), +3 meses (90d) ou +6 meses (180d)
        let opcoesAdicionais = [30, 60, 90, 180];
        let indiceSorteado = Math.abs(hash) % opcoesAdicionais.length;
        let diasAdicionais = opcoesAdicionais[indiceSorteado];

        ultimoAlvoDias += diasAdicionais;

        let labelMeses = Math.round(ultimoAlvoDias / 30);

        metas.push({
            label: `${labelMeses} Meses`,
            days: ultimoAlvoDias,
            suffix: `proc-${contadorFase}`
        });

        contadorFase++;
    }

    return metas;
}

let appData = {
    usuario1: { streak: 0, treinouHoje: false, util: true },
    usuario2: { streak: 0, treinouHoje: false, util: true }
};

function updateDashboard() {
    const users = ['usuario1', 'usuario2'];

    // 1. Captura a data real do Sistema Operacional do aparelho (Formato: dd/mm/yyyy)
    const hojeDispositivo = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    users.forEach(user => {
        const streak = appData[user].streak;
        const ehUtil = appData[user].util !== undefined ? appData[user].util : true;

        const btnCheckin = document.getElementById(`checkin-${user}`);
        const btnDesfazer = document.getElementById(`desfazer-${user}`);

        document.getElementById(`streak-${user}`).innerText = `${streak} ${streak === 1 ? 'Dia' : 'Dias'}`;

        // [MANTÉM AS SUAS TRAVAS ATUAIS DE BOTÃO]
        let jaTreinouHojeReal = appData[user].treinouHoje;
        if (appData[user].historicoCompleto) {
            jaTreinouHojeReal = appData[user].historicoCompleto.some(registro =>
                registro.data === hojeDispositivo && registro.marcado === true
            );
        }
        appData[user].treinouHoje = jaTreinouHojeReal;

        if (btnCheckin && btnDesfazer) {
            if (!ehUtil) {
                btnCheckin.innerText = "Academia Fechada (Feriado/FDS)";
                btnCheckin.style.backgroundColor = "#757575";
                btnCheckin.disabled = true;
                btnDesfazer.style.display = "none";
            } else if (jaTreinouHojeReal) {
                btnCheckin.innerText = "Parabéns pelo treino!";
                btnCheckin.style.backgroundColor = "#2e7d32";
                btnCheckin.disabled = true;
                btnDesfazer.style.display = "block";
            } else {
                btnCheckin.innerText = "Marcar Treino";
                btnCheckin.style.backgroundColor = "";
                btnCheckin.disabled = false;
                btnDesfazer.style.display = "none";
            }
        }

        // ============================================================
        // NOVA LOGICA DE METAS PROCEDURAIS INFINITAS
        // ============================================================
        // Gera a trilha de metas estendida dinamicamente baseada no streak atual do usuário
        const listaMetasDinamica = gerarProximaMetaProcedural(streak, user);

        let currentTarget = listaMetasDinamica[listaMetasDinamica.length - 1];
        let previousDays = 0;

        for (let target of listaMetasDinamica) {
            if (streak < target.days) {
                currentTarget = target;
                break;
            }
            previousDays = target.days;
        }

        // Atualiza o texto da meta na tela (Ex: "Meta Atual: 5 Meses")
        document.getElementById(`phase-${user}`).innerText = currentTarget.label;

        // Calcula a porcentagem exata de preenchimento do bloco atual
        const targetRange = currentTarget.days - previousDays;
        const currentProgress = streak - previousDays;
        const percentage = Math.max((currentProgress / targetRange) * 100, 0);

        const progressBar = document.getElementById(`progress-${user}`);
        if (progressBar) progressBar.style.width = `${Math.min(percentage, 100)}%`;

        // Atualiza a cor das bolinhas (badges) de conquistas básicas do HTML (1w até 3m)
        // Como o HTML tem medalhas fixas para os 3 primeiros meses, validamos apenas elas na tela
        let conquistasIniciais = ['1w', '2w', '1m', '2m', '3m'];
        conquistasIniciais.forEach(suffix => {
            const badgeEl = document.getElementById(`badge-${user}-${suffix}`);
            if (badgeEl) {
                // Procura o Alvo equivalente em dias para acender a medalha corretamente
                let diasEquivalentes = suffix === '1w' ? 7 : suffix === '2w' ? 14 : suffix === '1m' ? 30 : suffix === '2m' ? 60 : 90;
                if (streak >= diasEquivalentes) badgeEl.classList.add('completed');
                else badgeEl.classList.remove('completed');
            }
        });
    });
}

// Substitua a função fetchData do seu script.js por esta:
async function fetchData() {
    try {
        if (document.getElementById('streak-usuario1')) document.getElementById('streak-usuario1').innerText = "Carregando...";
        if (document.getElementById('streak-usuario2')) document.getElementById('streak-usuario2').innerText = "Carregando...";

        const response = await fetch(SCRIPT_URL);
        if (response.ok) {
            const textData = await response.text();
            const data = JSON.parse(textData);

            // Mapeamento dos Streaks e regras básicas
            appData.usuario1.streak = data.usuario1.streak || 0;
            appData.usuario2.streak = data.usuario2.streak || 0;
            appData.usuario1.util = data.usuario1.util;
            appData.usuario2.util = data.usuario2.util;

            // Injeta o histórico bruto retornado pelo servidor para validação de data do S.O.
            if (data.historicoBruto) {
                appData.usuario1.historicoCompleto = data.historicoBruto.map(r => ({ data: r.data, marcado: !!r.u1 }));
                appData.usuario2.historicoCompleto = data.historicoBruto.map(r => ({ data: r.data, marcado: !!r.u2 }));
            } else {
                // Fallback caso o back-end simplificado mude de estrutura
                appData.usuario1.treinouHoje = !!data.usuario1.treinouHoje;
                appData.usuario2.treinouHoje = !!data.usuario2.treinouHoje;
            }

            updateDashboard();
        }
    } catch (error) {
        console.error("Erro ao buscar dados do Sheets:", error);
        updateDashboard();
    }
}

// Substitua a função sendActionToSheets do seu script.js por esta:
async function sendActionToSheets(user, actionType) {
    try {
        if (document.getElementById(`streak-${user}`)) document.getElementById(`streak-${user}`).innerText = "Salvando...";

        const urlComParametros = `${SCRIPT_URL}?user=${user}&action=${actionType}`;
        const response = await fetch(urlComParametros);

        if (response.ok) {
            const textData = await response.text();
            const data = JSON.parse(textData);

            appData.usuario1.streak = data.usuario1.streak || 0;
            appData.usuario2.streak = data.usuario2.streak || 0;
            appData.usuario1.util = data.usuario1.util;
            appData.usuario2.util = data.usuario2.util;

            if (data.historicoBruto) {
                appData.usuario1.historicoCompleto = data.historicoBruto.map(r => ({ data: r.data, marcado: !!r.u1 }));
                appData.usuario2.historicoCompleto = data.historicoBruto.map(r => ({ data: r.data, marcado: !!r.u2 }));
            } else {
                appData.usuario1.treinouHoje = !!data.usuario1.treinouHoje;
                appData.usuario2.treinouHoje = !!data.usuario2.treinouHoje;
            }

            updateDashboard();
        }
    } catch (error) {
        console.error("Erro na sincronização direta:", error);
        setTimeout(fetchData, 1000);
    }
}

// ============================================================
// ====== CONTROLE DE CLIQUE E TRAVAS DE SEGURANÇA ============
// ============================================================

// AÇÕES DO RAFAEL (USUARIO 1)
const btnCheckin1 = document.getElementById('checkin-usuario1');
if (btnCheckin1) {
    btnCheckin1.addEventListener('click', () => {
        // TRAVA DE SEGURANÇA: Bloqueia a execução se já estiver marcado no dia
        if (appData.usuario1.treinouHoje) {
            console.warn("Ação bloqueada: Rafael já possui treino registrado hoje.");
            return;
        }

        // Se estiver liberado, executa a marcação
        appData.usuario1.treinouHoje = true;
        appData.usuario1.streak += 1;
        updateDashboard(); // Atualiza a interface imediatamente (Bloqueia o botão na tela)
        sendActionToSheets('usuario1', 'checkin'); // Envia para o banco de dados
    });
}

const btnDesfazer1 = document.getElementById('desfazer-usuario1');
if (btnDesfazer1) {
    btnDesfazer1.addEventListener('click', () => {
        if (confirm("Deseja remover a marcação de treino de hoje?")) {
            appData.usuario1.treinouHoje = false;
            appData.usuario1.streak = Math.max(0, appData.usuario1.streak - 1);
            updateDashboard(); // Libera o botão principal na tela imediatamente
            sendActionToSheets('usuario1', 'checkin'); // Avisa o banco para retirar o X
        }
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

// AÇÕES DA ISABELLY (USUARIO 2)
const btnCheckin2 = document.getElementById('checkin-usuario2');
if (btnCheckin2) {
    btnCheckin2.addEventListener('click', () => {
        // TRAVA DE SEGURANÇA: Bloqueia a execução se já estiver marcado no dia
        if (appData.usuario2.treinouHoje) {
            console.warn("Ação bloqueada: Isabelly já possui treino registrado hoje.");
            return;
        }

        // Se estiver liberado, executa a marcação
        appData.usuario2.treinouHoje = true;
        appData.usuario2.streak += 1;
        updateDashboard(); // Atualiza a interface imediatamente (Bloqueia o botão na tela)
        sendActionToSheets('usuario2', 'checkin'); // Envia para o banco de dados
    });
}

const btnDesfazer2 = document.getElementById('desfazer-usuario2');
if (btnDesfazer2) {
    btnDesfazer2.addEventListener('click', () => {
        if (confirm("Deseja remover a marcação de treino de hoje?")) {
            appData.usuario2.treinouHoje = false;
            appData.usuario2.streak = Math.max(0, appData.usuario2.streak - 1);
            updateDashboard(); // Libera o botão principal na tela imediatamente
            sendActionToSheets('usuario2', 'checkin'); // Avisa o banco para retirar o X
        }
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

// ============================================================
// ====== LÓGICA DE INSTALAÇÃO DO APLICATIVO (PWA) ============
// ============================================================
let deferredPrompt;
const installBanner = document.getElementById('pwa-install-banner');
const btnPwaInstall = document.getElementById('btn-pwa-install');
const btnPwaClose = document.getElementById('btn-pwa-close');

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => { reg.update(); })
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
        await deferredPrompt.userChoice;
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

// EVENTO DO BOTÃO FORÇAR SINCRONIZAÇÃO
const btnSincronizar = document.getElementById('btn-sincronizar');
if (btnSincronizar) {
    btnSincronizar.addEventListener('click', async () => {
        // Altera temporariamente o texto para dar um feedback visual de clique
        const textoOriginal = btnSincronizar.innerHTML;
        btnSincronizar.innerHTML = "🔄 Sincronizando...";
        btnSincronizar.disabled = true;
        btnSincronizar.style.opacity = "0.7";

        // Força a busca limpa dos dados direto do Google Sheets
        await fetchData();

        // Restaura o botão após a conclusão da leitura
        btnSincronizar.innerHTML = textoOriginal;
        btnSincronizar.disabled = false;
        btnSincronizar.style.opacity = "1";

        console.log("Sincronização manual concluída com sucesso!");
    });
}
