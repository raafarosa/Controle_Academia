// CONFIGURAÇÕES DO SUPABASE - PREENCHA COM SUAS CHAVES
const SUPABASE_URL = "https://bwsnmsmidnwluaxexhaw.supabase.co";
const SUPABASE_KEY = "sb_publishable_ixknufEbsK02YSs7qGGNvw_gsWl74Sq";

// Inicializa o cliente Supabase de forma direta — o CDN em index.html deve carregar a função `createClient`.
console.log("🔧 Inicializando Supabase client...");
let supabase = null;
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else if (typeof createClient === 'function') {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.error('❌ SDK Supabase não encontrado. Confira se o script do CDN está em index.html');
    }
} catch (e) {
    console.error('❌ Erro ao criar cliente Supabase:', e);
}

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
    console.log("🚀 DOM Carregado! Iniciando aplicação...");

    if (!supabase) {
        console.error('❌ Cliente Supabase não inicializado. Verifique o CDN e as chaves.');
        alert('Erro ao conectar ao serviço de autenticação. Veja o console para mais detalhes.');
        return;
    }
    console.log('✅ Cliente Supabase pronto.');

    configurarEventosIniciais();
    
    console.log("🔍 Verificando sessão ativa...");
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        console.log("✅ Sessão encontrada! User ID:", session.user.id);
        usuarioLogado = session.user;
        await verificarFluxoDeGrupo();
    } else {
        console.log("❌ Nenhuma sessão ativa. Mostrando tela de autenticação.");
        mostrarTela('autenticacao');
    }
});

// Direciona o fluxo visual do App dependendo do vínculo do usuário
async function verificarFluxoDeGrupo() {
    if (!usuarioLogado) {
        console.error("❌ Nenhum usuário logado!");
        return;
    }

    console.log("🔍 Verificando fluxo de grupo para user:", usuarioLogado.id);

    // Busca o perfil do usuário logado
    const { data: perfil, error } = await supabase
        .from('perfis')
        .select('*, grupos(nome, codigo_convite)')
        .eq('id', usuarioLogado.id)
        .single();

    if (error) {
        console.error("❌ Erro ao buscar perfil:", error.message);
    }
    
    if (!perfil) {
        console.error("❌ Perfil não encontrado!");
    }
    
    console.log("📋 Perfil encontrado:", !!perfil);
    console.log("👥 Tem grupo_id?", !!perfil?.grupo_id, "| grupo_id:", perfil?.grupo_id);

    if (error || !perfil || !perfil.grupo_id) {
        console.log("➡️ Redirecionando para tela de GRUPO");
        mostrarTela('grupo');
    } else {
        console.log("✅ Usuário tem grupo! Carregando painel...");
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
    console.log("📊 Buscando dados do grupo:", dadosDoGrupo?.id);
    
    if (!dadosDoGrupo) {
        console.error("❌ Nenhum grupo selecionado!");
        return;
    }

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
            grupo_id: dadosDoGrupo.id, 
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
// Fluxo de Cadastro e Entrada de Usuários / Grupos
function configurarEventosIniciais() {
    console.log("📋 Configurando eventos iniciais de autenticação...");
    
    // Altera interface entre Login e Cadastro
    document.getElementById('AlternarAuth').addEventListener('click', () => {
        console.log("🔄 Alternando entre Login e Cadastro. Modo atual:", modoAuth);
        if (modoAuth === "login") {
            modoAuth = "cadastro";
            document.getElementById('auth-titulo').innerText = "Criar Nova Conta";
            document.getElementById('grupo-nome-completo').style.display = 'block';
            document.getElementById('btn-auth-principal').innerText = "Cadastrar";
            document.getElementById('AlternarAuth').innerText = "Já tem uma conta? Conecte-se";
            console.log("✏️ Modo alterado para: CADASTRO");
        } else {
            modoAuth = "login";
            document.getElementById('auth-titulo').innerText = "Entrar no Sistema";
            document.getElementById('grupo-nome-completo').style.display = 'none';
            document.getElementById('btn-auth-principal').innerText = "Entrar";
            document.getElementById('AlternarAuth').innerText = "Não tem conta? Cadastre-se";
            console.log("✏️ Modo alterado para: LOGIN");
        }
    });

    // Submissão do Formulário de Autenticação Tradicional
    document.getElementById('btn-auth-principal').addEventListener('click', async () => {
        console.log("🔐 Botão de autenticação clicado. Modo:", modoAuth);
        
        const email = document.getElementById('auth-email').value.trim();
        const senha = document.getElementById('auth-senha').value.trim();
        const nome = document.getElementById('auth-nome').value.trim();

        console.log("📧 Email:", email);
        console.log("🔑 Senha preenchida:", !!senha);
        console.log("👤 Nome:", nome || "(não preenchido)");

        if (!email || !senha) {
            console.error("❌ Campos obrigatórios não preenchidos!");
            return alert("Preencha os campos obrigatórios!");
        }

        if (modoAuth === "cadastro") {
            console.log("📝 Iniciando CADASTRO...");
            if (!nome) {
                console.error("❌ Nome é obrigatório para cadastro!");
                return alert("Preencha seu nome para o card.");
            }
            
            console.log("📤 Enviando signUp para Supabase...");
            const { data: authData, error: authError } = await supabase.auth.signUp({ email, password: senha });
            
            if (authError) {
                console.error("❌ Erro no signUp:", authError.message);
                return alert(`Erro no cadastro: ${authError.message}`);
            }
            
            console.log("✅ SignUp bem-sucedido! User ID:", authData.user?.id);
            
            if (authData.user) {
                console.log("👤 Criando perfil para user ID:", authData.user.id);
                const { error: perfilError } = await supabase.from('perfis').insert({ 
                    id: authData.user.id, 
                    nome_completo: nome 
                });
                
                if (perfilError) {
                    console.error("❌ Erro ao criar perfil:", perfilError.message);
                    return alert(`Erro ao criar perfil: ${perfilError.message}`);
                }
                
                console.log("✅ Perfil criado com sucesso!");
                usuarioLogado = authData.user;
                await verificarFluxoDeGrupo();
            }
        } else {
            console.log("🔓 Iniciando LOGIN...");
            console.log("📤 Enviando signInWithPassword para Supabase...");
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: senha });
            
            if (authError) {
                console.error("❌ Erro no signInWithPassword:", authError.message);
                return alert(`Acesso negado: ${authError.message}`);
            }
            
            console.log("✅ Login bem-sucedido! User ID:", authData.user?.id);
            usuarioLogado = authData.user;
            await verificarFluxoDeGrupo();
        }
    });

    // NOVO: Autenticação via Conta do Google
    document.getElementById('btn-auth-google').addEventListener('click', async () => {
        console.log("🔐 Botão Google clicado");
        const urlRedirecionamento = window.location.origin + window.location.pathname;
        console.log("📍 URL de redirecionamento:", urlRedirecionamento);
        
        console.log("📤 Iniciando signInWithOAuth (Google)...");
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: urlRedirecionamento
            }
        });
        
        if (error) {
            console.error("❌ Erro no OAuth Google:", error.message);
            alert(`Erro na autenticação do Google: ${error.message}`);
        } else {
            console.log("✅ Redirecionando para Google...");
        }
    });

    // Quando o usuário volta do login do Google pela primeira vez, precisamos garantir que ele ganhe um "perfil"
    console.log("⚙️ Configurando onAuthStateChange listener...");
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("🔔 Auth State Changed - Event:", event, "| Session:", !!session);
        
        if (event === "SIGNED_IN" && session) {
            console.log("✅ Usuário SIGNED_IN. User ID:", session.user.id);
            usuarioLogado = session.user;
            
            // Verifica se o perfil desse login do Google já existe no banco
            console.log("🔍 Verificando se perfil existe no banco...");
            const { data: perfilExistente, error: perfilError } = await supabase
                .from('perfis')
                .select('id')
                .eq('id', usuarioLogado.id)
                .single();
            
            if (perfilError) {
                console.log("ℹ️ Perfil não existe (esperado na primeira vez):", perfilError.message);
            } else {
                console.log("✅ Perfil encontrado no banco!");
            }
                
            // Se não existir perfil, cria um automático usando o nome configurado na conta do Google dele
            if (!perfilExistente) {
                console.log("➕ Criando perfil automático...");
                const nomeGoogle = usuarioLogado.user_metadata?.full_name || usuarioLogado.user_metadata?.name || usuarioLogado.email || "Membro Acadêmico";
                console.log("👤 Nome do Google:", nomeGoogle);
                const { error: insertError } = await supabase.from('perfis').insert({ id: usuarioLogado.id, nome_completo: nomeGoogle });
                if (insertError) {
                    console.error("❌ Erro ao criar perfil automático:", insertError.message);
                } else {
                    console.log("✅ Perfil automático criado!");
                }
            }
            
            await verificarFluxoDeGrupo();
        }
    });

    // Ações de gerenciamento de grupo
    document.getElementById('btn-criar-grupo').addEventListener('click', async () => {
        console.log("🔧 Botão criar grupo clicado");
        const nomeGrupo = document.getElementById('input-nome-grupo').value.trim();
        console.log("📝 Nome do grupo:", nomeGrupo);
        
        if (!nomeGrupo) {
            console.error("❌ Nome do grupo vazio!");
            return alert("Dê um nome ao grupo.");
        }

        const codigoUnico = Math.random().toString(36).substring(2, 8).toUpperCase();
        console.log("🔑 Código único gerado:", codigoUnico);

        console.log("📤 Enviando novo grupo para Supabase...");
        const { data: novoGrupo, error } = await supabase
            .from('grupos')
            .insert({ nome: nomeGrupo, codigo_convite: codigoUnico })
            .select().single();

        if (error) {
            console.error("❌ Erro ao criar grupo:", error.message);
            return alert("Erro ao erguer o grupo.");
        }

        console.log("✅ Grupo criado! ID:", novoGrupo.id);
        console.log("🔗 Atualizando perfil com grupo_id...");
        const { error: updateError } = await supabase.from('perfis').update({ grupo_id: novoGrupo.id }).eq('id', usuarioLogado.id);
        
        if (updateError) {
            console.error("❌ Erro ao atualizar perfil:", updateError.message);
        } else {
            console.log("✅ Perfil atualizado!");
        }
        
        await verificarFluxoDeGrupo();
    });

    document.getElementById('btn-entrar-grupo').addEventListener('click', async () => {
        console.log("🔧 Botão entrar grupo clicado");
        const codigo = document.getElementById('input-codigo-convite').value.trim().toUpperCase();
        console.log("🔑 Código digitado:", codigo);
        
        if (!codigo) {
            console.error("❌ Código vazio!");
            return alert("Insira um código.");
        }

        console.log("🔍 Buscando grupo com código:", codigo);
        const { data: grupoExistente, error } = await supabase
            .from('grupos')
            .select()
            .eq('codigo_convite', codigo)
            .single();

        if (error) {
            console.error("❌ Erro ao buscar grupo:", error.message);
            return alert("Código de grupo inexistente.");
        }
        
        if (!grupoExistente) {
            console.error("❌ Nenhum grupo encontrado com esse código!");
            return alert("Código de grupo inexistente.");
        }

        console.log("✅ Grupo encontrado! ID:", grupoExistente.id);
        console.log("🔗 Atualizando perfil com grupo_id...");
        const { error: updateError } = await supabase.from('perfis').update({ grupo_id: grupoExistente.id }).eq('id', usuarioLogado.id);
        
        if (updateError) {
            console.error("❌ Erro ao atualizar perfil:", updateError.message);
        } else {
            console.log("✅ Perfil atualizado!");
        }
        
        await verificarFluxoDeGrupo();
    });

    document.getElementById('btn-logout').addEventListener('click', async () => {
        console.log("🚪 Logout clicado");
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