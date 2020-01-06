var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(2000);
console.log("Server Started!");

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

var SOCKET_LIST = {};
var PLAYER_LIST = {};
var posXStart = 150;
var posYStart = 150;
var maxSpdStart = 10;

var Player = function(id){
    var self = {
        id:id,
        x:posXStart,
        y:posYStart,
        number:"" + Math.floor(10 * Math.random()),
        pressingUp:false,
        pressingRight:false,
        pressingDown:false,
        pressingLeft:false,
        maxSpd:maxSpdStart
    }
    self.updatePosition = function(){
        if(self.pressingUp){
            self.y -= self.maxSpd;
        }
        if(self.pressingRight){
            self.x += self.maxSpd;
        }
        if(self.pressingDown){
            self.y += self.maxSpd;
        }
        if(self.pressingLeft){
            self.x -= self.maxSpd;
        }
    }
    return self;
}

io.on('connection', function (socket) {
    // gera um número randômico para cada jogador que conectar ao socket.
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    // a variável player pega o array do jogador.
    var player = Player(socket.id);
    PLAYER_LIST[socket.id] = player;

    console.log('User ' + player.number + ' connected.');

    socket.on('reset',function(data){
        console.log('Resetou a posição x:' + player.x + ' e y:' + player.y + ' para x:' + posXStart + ' e y:' + posYStart + ' do user: ' + player.number + ' | ' + data.msg);
        player.x = posXStart;
        player.y = posYStart;
    });

    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
        console.log('User ' + player.number + ' disconnected.');
    });

    socket.on('keyPress',function(data){
        if(data.inputId === 'up'){
            player.pressingUp = data.state;
        }else if(data.inputId === 'right'){
            player.pressingRight = data.state;
        }else if(data.inputId === 'down'){
            player.pressingDown = data.state;
        }else if(data.inputId === 'left'){
            player.pressingLeft = data.state;
        }
    });
});

setInterval(function(){
    var pack = [];
    for(var i in PLAYER_LIST){
        var player = PLAYER_LIST[i];
        player.updatePosition();
        posXatual = player.x;
        posYatual = player.y;
        pack.push({
            x:posXatual,
            y:posYatual,
            number:player.number
        });
    }
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }
},1000/25);