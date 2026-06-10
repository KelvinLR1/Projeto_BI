# Guia de Instalação - HUB BI

Siga os passos abaixo para configurar o ambiente de desenvolvimento (Backend e Frontend).

## 1. Clonar o Repositório
```bash
git clone <url-do-repositorio>
cd Projeto_BI
```

## 2. Configurar o Backend (Python)
Navegue até a pasta do backend, crie o ambiente virtual e instale as dependências.
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r ../requirements.txt
```

## 3. Configurar o Frontend (Next.js)
Abra um novo terminal na pasta do frontend e instale os pacotes do Node.
```bash
cd frontend
npm install
```

## 4. Variáveis de Ambiente (.env)
Certifique-se de que o arquivo `.env` na raiz do projeto esteja configurado:
```env
DB_HOST=seu-servidor
DB_NAME=HUBBIDB
DB_USER=sa
DB_PASS=SuaSenha
DB_TRUSTED_CONNECTION=False
APP_MODE=DEMO  # Use DEMO para testar sem banco de dados
```

## 5. Execução

### Rodar o Backend:
```bash
cd backend
uvicorn main:app --reload
```

### Rodar o Frontend:
```bash
cd frontend
npm run dev
```

Acesse o sistema em: `http://localhost:3000`

## Solução de Problemas
- **CORS Error:** Verifique se o backend está permitindo a origem do frontend no arquivo `main.py`.
- **Node Version:** Utilize o Node.js 18 ou superior para o frontend.
- **Python Version:** Recomenda-se Python 3.9+.
