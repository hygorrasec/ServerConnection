var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(2000);
console.log("Server Started!");

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

var SOCKET_LIST = {};

io.on('connection', function (socket) {
    socket.id = Math.random();
    socket.x = 0;
    socket.y = 0;
    socket.number = "" + Math.floor(10 * Math.random());
    SOCKET_LIST[socket.id] = socket;

    console.log("User connected.");
    socket.on('reset', function (data) {
        socket.x = 0;
        socket.y = 0;
        console.log('Resetou a posição x:' + posXatual + ' e y:' + posYatual + ' para x:0 e y:0 do user: ' + socket.number + ' | ' + data.msg);
    });

    socket.emit('serverMsg', { msg: '<msg do servidor>' });

    socket.on('disconnect', function () {
        delete SOCKET_LIST[socket.id];
        console.log('User disconnected.');
    });
});

setInterval(function(){
    var pack = [];
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        posXatual = socket.x++;
        posYatual = socket.y++;
        pack.push({
            x:posXatual,
            y:posYatual,
            number:socket.number
        });
    }
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }
},1000/25);