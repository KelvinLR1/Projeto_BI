# Documentação de Arquitetura - HUB BI

## Visão Geral
O sistema utiliza uma arquitetura moderna e escalável de aplicação web desacoplada, composta por um backend em **FastAPI** e um frontend em **Next.js**, separando responsabilidades entre lógica de dados, API e interface de usuário de alta performance.

## Camadas

### 1. Backend (`/backend`)
- **FastAPI:** Gerencia rotas RESTful, processamento assíncrono e validação de dados.
- **DataManager (database.py):** Centraliza todas as chamadas SQL utilizando SQLAlchemy. Implementa cache e fallback para dados fictícios (Modo DEMO).
- **SettingsManager:** Gerencia configurações do sistema e variáveis de ambiente.
- **Scripts/Layouts:** Armazena e recupera configurações dinâmicas de gráficos e KPIs em arquivos JSON.

### 2. Frontend (`/frontend`)
- **Next.js (App Router):** Framework principal para renderização e roteamento.
- **Tailwind CSS:** Sistema de design para interface "Premium Dark" com efeitos neon.
- **Recharts:** Motor de visualização de dados para gráficos dinâmicos e interativos.
- **Framer Motion:** Responsável por micro-animações e transições fluidas.

## Tecnologias Chave
- **FastAPI:** Framework backend de alta performance.
- **Next.js 15:** Framework frontend moderno.
- **SQLAlchemy:** Abstração de banco de dados.
- **Pandas:** Manipulação de dados no backend.
- **Lucide React:** Conjunto de ícones para a interface.

## Fluxo de Dados
1. O usuário interage com a interface no **Next.js**.
2. O frontend faz requisições assíncronas (fetch) para a API **FastAPI**.
3. O Backend processa a solicitação, consulta o banco de dados (ou cache) e retorna os dados formatados em JSON.
4. O frontend recebe o JSON e renderiza os gráficos e KPIs de forma reativa.
5. Logs de performance são gerados no backend para monitoramento de rotas críticas.
