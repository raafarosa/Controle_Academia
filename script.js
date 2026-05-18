// CONFIGURAÇÕES DO SUPABASE - PREENCHA COM SUAS CHAVES
const SUPABASE_URL = "https://SEU_PROJETO.supabase.co";
const SUPABASE_KEY = "SUA_CHAVE_ANON_PUBLIC";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variáveis de Estado da Aplicação
let modoAuth = "login"; // login ou cadastro
let usuarioLogado = null;
let dadosDoGrupo = null;
let membrosDoGrupo = [];

// Função Geradora de Metas Procedurais Unificadas usando o ID do Grupo como Semente
function gerarProximaMetaProcedural(streakAtual, idGrupo) {
    let metas = [
        { label: '1 Semana', days: 7, suffix: '1w' },
        { label: '2 Semanas', days: 14, suffix: '2w' },
        { label: '1 Mês', days: 30, suffix: '1m' },
        { label: '2 Meses', days: 60, suffix: '2m' },
        { label: '3 Meses', days: 90, suffix: '3m' }
    ];

    let ultimoAlvoDias = 90;
    let contadorFase = 1;

    while (streakAtual >= ultimoAlvoDias) {
        // Usa o ID do grupo + a fase atual para fixar a mesma aleatoriedade para todos os membros
        let stringSemente = idGrupo + contadorFase;
        let hash = 0;
        for (let i = 0; i < stringSemente.length; i++) {
            hash = stringSemente.charCodeAt(i) + ((hash << 5) - hash);
        }

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

// Verifica e monitora o Estado de Login do Usuário
window.addEventListener('DOMContentLoaded', async () => {
    configurarEventosIniciais();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        usuarioLogado = session.user;
        await verificarFluxoDeGrupo();
    } else {
        mostrarTela('autenticacao');
    }
});

// Direciona o fluxo visual do App dependendo do vínculo do usuário
async function verificarFluxoDeGrupo() {
    if (!usuarioLogado) return;

    // Busca o perfil do usuário logado
    const { data: perfil, error } = await supabase
        .from('perfis')
        .select('*, grupos(nome, codigo_convite)')
        .eq('id', usuarioLogado.id)
        .single();

    if (error || !perfil || !perfil.grupo_id) {
        mostrarTela('grupo');
    } else {
        dadosDoGrupo = perfil.grupos;
        dadosDoGrupo.id = perfil.grupo_id;
        document.getElementById('btn-logout').style.display = 'block';
        document.getElementById('exibir-codigo-grupo').innerText = `Código do Grupo: ${dadosDoGrupo.codigo_convite}`;
        if (document.getElementById('titulo-app')) {
            document.getElementById('titulo-app').innerText = `${dadosDoGrupo.nome} 🏋️‍♂️`;
        }
        mostrarTela('painel');
        await buscarDadosDoGrupo();
    }
}

// Busca todos os usuários do grupo e o histórico vertical de treinos de cada um
async function buscarDadosDoGrupo() {
    if (!dadosDoGrupo) return;

    const { data: perfis, error } = await supabase
        .from('perfis')
        .select(`
            id,
            nome_completo,
            frequencia (
                data_treino,
                marcado
            )
        `)
        .eq('grupo_id', dadosDoGrupo.id);

    if (error) {
        console.error("Erro ao puxar dados do grupo:", error);
        return;
    }

    membrosDoGrupo = perfis;
    renderizarPainelTreinos();
}

// Desenha dinamicamente os cards de competição na tela
function renderizarPainelTreinos() {
    const container = document.getElementById('painel-treinos');
    container.innerHTML = '';

    const hojeISO = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const diaSemana = new Date().getDay();
    const ehFimDeSemana = (diaSemana === 0 || diaSemana === 6); // 0 = Domingo, 6 = Sábado

    membrosDoGrupo.forEach((membro, index) => {
        // Filtra os treinos válidos e calcula o Streak sequencial de dias úteis
        const treinosValidos = membro.frequencia ? membro.frequencia.filter(t => t.marcado) : [];
        const datasTreinadas = new Set(treinosValidos.map(t => t.data_treino));
        
        const streak = calcularStreakDiasUteis(datasTreinadas);
        const treinouHoje = datasTreinadas.has(hojeISO);

        // Gera as metas procedurais baseadas no streak e no ID do grupo
        const listaMetas = gerarProximaMetaProcedural(streak, dadosDoGrupo.id);
        let metaAtual = listaMetas[listaMetas.length - 1];
        let diasAnteriores = 0;

        for (let meta of listaMetas) {
            if (streak < meta.days) {
                metaAtual = meta;
                break;
            }
            diasAnteriores = meta.days;
        }

        const alcanceMeta = metaAtual.days - diasAnteriores;
        const progressoAtual = streak - diasAnteriores;
        const porcentagemBarra = Math.min(Math.max((progressoAtual / alcanceMeta) * 100, 0), 100);

        // Atribui cores alternadas aos cards para manter a diferenciação estética
        const corCardClasse = index % 2 === 0 ? 'card-usuario1-estilo' : 'card-usuario2-estilo';

        const cardHTML = `
            <section class="athlete-card ${corCardClasse}">
                <h2 class="athlete-name">${membro.nome_completo}</h2>

                <div class="dashboard-stats">
                    <div class="stat-box">
                        <h3>Streak Atual</h3>
                        <p>${streak} ${streak === 1 ? 'Dia' : 'Dias'}</p>
                    </div>
                    <div class="stat-box">
                        <h3>Meta Atual</h3>
                        <p>${metaAtual.label}</p>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${porcentagemBarra}%;"></div>
                        </div>
                    </div>
                </div>

                <div class="goals-timeline">
                    <h3>Progresso do Bloco</h3>
                    <div class="badges">
                        <div class="badge ${streak >= 7 ? 'completed' : ''}">1 Sem</div>
                        <div class="badge ${streak >= 14 ? 'completed' : ''}">2 Sem</div>
                        <div class="badge ${streak >= 30 ? 'completed' : ''}">1 Mês</div>
                        <div class="badge ${streak >= 60 ? 'completed' : ''}">2 Mês</div>
                        <div class="badge ${streak >= 90 ? 'completed' : ''}">3 Mês</div>
                    </div>
                </div>

                <div class="actions">
                    ${membro.id === usuarioLogado.id ? `
                        <button id="btn-checkin-real" class="btn-primary" ${ehFimDeSemana || treinouHoje ? 'disabled style="background-color: #757575;"' : ''}>
                            ${ehFimDeSemana ? "Academia Fechada (FDS)" : treinouHoje ? "Parabéns pelo treino!" : "Marcar Treino"}
                        </button>
                        <button id="btn-desfazer-real" style="display: ${treinouHoje ? 'block' : 'none'}; background-color: #d32f2f; color: white; border: none; padding: 10px 14px; margin-top: 8px; border-radius: 8px; font-weight: bold; cursor: pointer;">
                            Clique acidental? Desfazer
                        </button>
                        <button id="btn-falhei-real" class="btn-danger" style="margin-top: 15px;">Falhei</button>
                    ` : `
                        <p style="text-align:center; font-size: 0.8rem; color:#8d8d99; padding: 10px;">Acompanhando progresso...</p>
                    `}
                </div>
            </section>
        `;

        container.insertAdjacentHTML('beforeend', cardHTML);

        // Aplica os eventos de clique apenas nos botões do próprio usuário logado
        if (membro.id === usuarioLogado.id) {
            document.getElementById('btn-checkin-real')?.addEventListener('click', () => registrarTreino(hojeISO));
            document.getElementById('btn-desfazer-real')?.addEventListener('click', () => desfazerTreino(hojeISO));
            document.getElementById('btn-falhei-real')?.addEventListener('click', resetarContador);
        }
    });
}

// Calcula o streak retroativo pulando finais de semana de forma perfeita
function calcularStreakDiasUteis(datasTreinadas) {
    if (datasTreinadas.size === 0) return 0;

    let streak = 0;
    let checarData = new Date(); // Começa de hoje para trás

    while (true) {
        const diaSemana = checarData.getDay();
        const strData = checarData.toISOString().split('T')[0];

        if (diaSemana === 0 || diaSemana === 6) {
            // Se for sábado ou domingo e tiver registro, conta. Se não tiver, pula sem quebrar o streak
            if (datasTreinadas.has(strData)) {
                streak++;
            }
        } else {
            // Se for dia útil e tiver treinado, soma ao streak
            if (datasTreinadas.has(strData)) {
                streak++;
            } else {
                // Se for dia útil e NÃO tiver treinado, o streak quebrou (a menos que seja hoje e ele ainda vá treinar)
                const hojeStr = new Date().toISOString().split('T')[0];
                if (strData === hojeStr) {
                    // Ignora o dia de hoje se ele ainda não marcou
                } else {
                    break; 
                }
            }
        }
        checarData.setDate(checarData.getDate() - 1);
    }
    return streak;
}

// Operações de Escrita e Modificação no Banco de Dados Supabase
async function registrarTreino(dataISO) {
    const { error } = await supabase
        .from('frequencia')
        .upsert({ 
            usuario_id: usuarioLogado.id, 
            group_id: dadosDoGrupo.id, 
            data_treino: dataISO, 
            marcado: true 
        }, { onConflict: 'usuario_id, data_treino' });

    if (error) alert("Erro ao computar presença.");
    await buscarDadosDoGrupo();
}

async function desfazerTreino(dataISO) {
    if (confirm("Deseja apagar o registro de treino de hoje?")) {
        const { error } = await supabase
            .from('frequencia')
            .delete()
            .eq('usuario_id', usuarioLogado.id)
            .eq('data_treino', dataISO);

        if (error) alert("Erro ao remover registro.");
        await buscarDadosDoGrupo();
    }
}

async function resetarContador() {
    if (confirm("Tem certeza absoluta que deseja desativar todo o seu histórico de progresso e zerar seu streak?")) {
        const { error } = await supabase
            .from('frequencia')
            .update({ marcado: false })
            .eq('usuario_id', usuarioLogado.id);

        if (error) alert("Erro ao reiniciar histórico.");
        await buscarDadosDoGrupo();
    }
}

// Fluxo de Cadastro e Entrada de Usuários / Grupos
function configurarEventosIniciais() {
    // Altera interface entre Login e Cadastro
    document.getElementById('AlternarAuth').addEventListener('click', () => {
        if (modoAuth === "login") {
            modoAuth = "cadastro";
            document.getElementById('auth-titulo').innerText = "Criar Nova Conta";
            document.getElementById('grupo-nome-completo').style.style.display = 'block';
            document.getElementById('btn-auth-principal').innerText = "Cadastrar";
            document.getElementById('AlternarAuth').innerText = "Já tem uma conta? Conecte-se";
        } else {
            modoAuth = "login";
            document.getElementById('auth-titulo').innerText = "Entrar no Sistema";
            document.getElementById('grupo-nome-completo').style.display = 'none';
            document.getElementById('btn-auth-principal').innerText = "Entrar";
            document.getElementById('AlternarAuth').innerText = "Não tem conta? Cadastre-se";
        }
    });

    // Submissão do Formulário de Autenticação
    document.getElementById('btn-auth-principal').addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value.trim();
        const senha = document.getElementById('auth-senha').value.trim();
        const nome = document.getElementById('auth-nome').value.trim();

        if (!email || !senha) return alert("Preencha os campos obrigatórios!");

        if (modoAuth === "cadastro") {
            if (!nome) return alert("Preencha seu nome para o card.");
            
            const { data: authData, error: authError } = await supabase.auth.signUp({ email, password: senha });
            if (authError) return alert(`Erro no cadastro: ${authError.message}`);
            
            if (authData.user) {
                await supabase.from('perfis').insert({ id: authData.user.id, nome_completo: nome });
                usuarioLogado = authData.user;
                await verificarFluxoDeGrupo();
            }
        } else {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: senha });
            if (authError) return alert(`Acesso negado: ${authError.message}`);
            usuarioLogado = authData.user;
            await verificarFluxoDeGrupo();
        }
    });

    // Ações de gerenciamento de grupo
    document.getElementById('btn-criar-grupo').addEventListener('click', async () => {
        const nomeGrupo = document.getElementById('input-nome-grupo').value.trim();
        if (!nomeGrupo) return alert("Dê um nome ao grupo.");

        const codigoUnico = Math.random().toString(36).substring(2, 8).toUpperCase();

        const { data: novoGrupo, error } = await supabase
            .from('grupos')
            .insert({ nome: nomeGrupo, codigo_convite: codigoUnico })
            .select().single();

        if (error) return alert("Erro ao erguer o grupo.");

        await supabase.from('perfis').update({ grupo_id: novoGrupo.id }).eq('id', usuarioLogado.id);
        await verificarFluxoDeGrupo();
    });

    document.getElementById('btn-entrar-grupo').addEventListener('click', async () => {
        const codigo = document.getElementById('input-codigo-convite').value.trim().toUpperCase();
        if (!codigo) return alert("Insira um código.");

        const { data: grupoExistente, error } = await supabase
            .from('grupos')
            .select()
            .eq('codigo_convite', codigo)
            .single();

        if (error || !grupoExistente) return alert("Código de grupo inexistente.");

        await supabase.from('perfis').update({ grupo_id: grupoExistente.id }).eq('id', usuarioLogado.id);
        await verificarFluxoDeGrupo();
    });

    document.getElementById('btn-logout').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.reload();
    });

    document.getElementById('btn-sincronizar').addEventListener('click', async () => {
        const btn = document.getElementById('btn-sincronizar');
        btn.innerText = "🔄 Sincronizando...";
        await buscarDadosDoGrupo();
        btn.innerText = "🔄 Sincronizar";
    });
}

function mostrarTela(tela) {
    document.getElementById('secao-autenticacao').style.display = tela === 'autenticacao' ? 'block' : 'none';
    document.getElementById('secao-grupo').style.display = tela === 'grupo' ? 'block' : 'none';
    document.getElementById('secao-painel').style.display = tela === 'painel' ? 'block' : 'none';
}