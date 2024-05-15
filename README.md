1. **Crie o arquivo package.json com as configurações padrão:**
```
npm init -y
```

2. **Instale as seguintes bibliotecas:**
- express: É um framework para Node.js.
- socket.io: Biblioteca para comunicação em tempo real.
- serve-favicon: Middleware para servir o favicon.ico.
- pg: Cliente PostgreSQL para Node.js.
- dotenv: Módulo para carregar variáveis de ambiente de um arquivo .env.
```
npm install express socket.io serve-favicon pg dotenv
```

4. **Instale o nodemon como dependência de desenvolvimento:**
```
npm install -D nodemon
```

2. **Alterando package.json**
```
    "scripts": {
        "start": "nodemon app.js"
    },
```

5. **Inicialize o projeto com o nodemon:**
```
npm start
```
