require('dotenv').config(); // Para carregar as variáveis de ambiente do arquivo .env
var express = require('express'); // Importa o módulo 'express'
var favicon = require('serve-favicon') // Importa o módulo 'serve-favicon'
var path = require('path') // Importa o módulo 'path'
var app = express(); // Cria uma instância do express
var serv = require('http').Server(app); // Cria um servidor HTTP com o express
var io = require('socket.io')(serv, {}); // Cria uma instância do socket.io associada ao servidor HTTP
var PORT = process.env.PORT || 2000; // Define a porta do servidor

const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

pool.on('error', (err, client) => {
    console.error('Erro inesperado no banco de dados:', err);
    process.exit(-1);
});

// Criação das tabelas se não existirem
(async () => {
    const createAccountsTableQuery = `
        CREATE TABLE IF NOT EXISTS accounts (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL
        )
    `;
    const createPlayersTableQuery = `
        CREATE TABLE IF NOT EXISTS players (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            level INT NOT NULL,
            exp INT NOT NULL,
            posx INT NOT NULL,
            posy INT NOT NULL,
            speed INT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    try {
        const client = await pool.connect();
        await client.query(createAccountsTableQuery);
        await client.query(createPlayersTableQuery);
        console.log('Tabelas criadas com sucesso.');
        client.release();
    } catch (err) {
        console.error('Erro ao criar as tabelas:', err);
    }
})();

app.use(express.static('public')); // Define o diretório 'public' como estático

// Adicione o middleware para servir o favicon.ico
app.use(favicon(path.join(__dirname, 'public', 'assets', 'imgs', 'favicon.ico')))

// Define a rota principal
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client')); // Define o diretório 'client' como estático

serv.listen(PORT); // Inicia o servidor na porta especificada
console.log("Servidor iniciado! Acesse: http://localhost:" + PORT);

pool.query('DELETE FROM players', (err, res) => {
    if (err) {
        console.error('Erro ao excluir jogadores:', err);
    } else {
        console.log('Todos os jogadores foram excluídos com sucesso.');
    }
});

var SOCKET_LIST = {}; // Objeto para armazenar os sockets conectados
var posXStart = 50; // Posição inicial X dos jogadores
var posYStart = 50; // Posição inicial Y dos jogadores
var maxSpdStart = 5; // Velocidade máxima dos jogadores

// Função construtora para criar entidades no jogo
var Entity = function() {
    var self = {
        x: posXStart,
        y: posYStart,
        spdX: 0,
        spdY: 0,
        id: "",
    }
    self.update = function() {
        self.updatePosition();
    }
    self.updatePosition = function() {
        self.x += self.spdX;
        self.y += self.spdY;
    };
    return self;
}

// Função construtora para criar jogadores
var Player = function(id) {
    var self = Entity();
    self.id = id;
    self.number = "" + Math.floor(10 * Math.random());
    self.pressingUp = false;
    self.pressingRight = false;
    self.pressingDown = false;
    self.pressingLeft = false;
    self.maxSpd = maxSpdStart;
    self.color = getPlayerColor(self.number); // Adiciona a cor do jogador
    var oldPosX = self.x;
    var oldPosY = self.y;

    var super_update = self.update;
    self.update = function() {
        self.updateSpd();
        super_update();
        if (oldPosX !== self.x || oldPosY !== self.y) {
            pool.query('UPDATE players SET posx=$1, posy=$2, updated_at=$3 WHERE name=$4', [self.x, self.y, new Date(), self.id], (err, res) => {
                if (err) {
                    console.error('Erro ao atualizar a posição do jogador:', err);
                }
            });
            oldPosX = self.x;
            oldPosY = self.y;
        }
    }

    self.updateSpd = function() {
        if (self.pressingRight) {
            self.spdX = self.maxSpd;
        } else if (self.pressingLeft) {
            self.spdX = -self.maxSpd;
        } else {
            self.spdX = 0;
        }
        if (self.pressingUp) {
            self.spdY = -self.maxSpd;
        } else if (self.pressingDown) {
            self.spdY = self.maxSpd;
        } else {
            self.spdY = 0;
        }
    }
    Player.list[id] = self; // Adiciona o jogador à lista de jogadores
    return self;
}
Player.list = {}; // Objeto para armazenar todos os jogadores conectados

// Função para retornar a cor com base no número do jogador
function getPlayerColor(number) {
    switch (number % 10) {
        case 0:
            return "#FF0000"; // Vermelho
        case 1:
            return "#00FF00"; // Verde
        case 2:
            return "#0000FF"; // Azul
        case 3:
            return "#FFFF00"; // Amarelo
        case 4:
            return "#FF00FF"; // Magenta
        case 5:
            return "#00FFFF"; // Ciano
        case 6:
            return "#FF8000"; // Laranja
        case 7:
            return "#8000FF"; // Roxo
        case 8:
            return "#00FF80"; // Verde claro
        case 9:
            return "#FF0080"; // Rosa
    }
}

// Função chamada quando um jogador se conecta
Player.onConnect = function(socket) {
    var player = Player(socket.id);
    pool.query('INSERT INTO players (name, level, exp, posx, posy, speed) VALUES ($1, $2, $3, $4, $5, $6)', [player.id, 1, 0, player.x, player.y, player.maxSpd], (err, res) => {
        if (err) {
            console.error('Erro ao criar jogador:', err);
            return;
        }
        // player.id = res.rows[0].id; // Atualiza o ID do jogador com o ID gerado pelo banco de dados
        console.log(player.id + ' criado com sucesso.');
        // Carrega todos os jogadores do banco de dados, exceto o jogador atual
        pool.query('SELECT * FROM players WHERE name != $1', [socket.id], (err, res) => {
            if (err) {
                console.error('Erro ao carregar jogadores:', err);
                return;
            }
        });
    });
    socket.on('keyPress', function(data) {
        if (data.inputId === 'up') {
            player.pressingUp = data.state;
        } else if (data.inputId === 'right') {
            player.pressingRight = data.state;
        } else if (data.inputId === 'down') {
            player.pressingDown = data.state;
        } else if (data.inputId === 'left') {
            player.pressingLeft = data.state;
        }
    });
}

// Função chamada quando um jogador se desconecta
Player.onDisconnect = function(socket) {
    console.log('Player ' + Player.list[socket.id].number + ' disconnected.');
    const playerId = Player.list[socket.id].id; // Obter o ID do jogador desconectado
    pool.query('DELETE FROM players WHERE id = $1', [playerId], (err, res) => {
        if (err) {
            console.error('Erro ao excluir jogador:', err);
        }
    });
    delete Player.list[socket.id];
}

// Atualiza a posição de todos os jogadores
Player.update = function() {
    var pack = [];
    for (var i in Player.list) {
        var player = Player.list[i];
        player.update();
        pack.push({
            x: player.x,
            y: player.y,
            number: player.number,
            color: player.color
        });
    }
    return pack;
}

var DEBUG = true;

// Evento de conexão de um novo socket
io.sockets.on('connection', function(socket) {
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    Player.onConnect(socket);
    console.log('User ' + Player.list[socket.id].number + ' connected.');

    // Evento de desconexão de um socket
    socket.on('disconnect', function() {
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
    });

    // Evento para enviar mensagem para todos os clientes
    socket.on('sendMsgToServer', function(data) {
        var playerName = ("" + socket.id).slice(2, 7);
        for (var i in SOCKET_LIST) {
            SOCKET_LIST[i].emit('addToChat', 'Jogador ' + playerName + ' disse: ' + data);
        }
    });

    // Evento para avaliar código no servidor (apenas para debug)
    socket.on('evalServer', function(data) {
        if (!DEBUG) {
            return;
        }
        var res = eval(data);
        socket.emit('evalAnswer', res);
    });

    // Evento para resetar a posição de um jogador
    socket.on('reset', function(data) {
        console.log('Usuario ' + Player.list[socket.id].number + ' resetou sua posição. ' + data.msg);
        Player.list[socket.id].x = posXStart;
        Player.list[socket.id].y = posYStart;
    });
});

// Loop principal do servidor para atualizar as posições dos jogadores
setInterval(function() {
    var pack = {
        player: Player.update(),
    }

    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions', pack);
    }
}, 1000 / 25); // 25 frames por segundo
