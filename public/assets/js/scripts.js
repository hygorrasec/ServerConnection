// Conecta-se ao servidor via Socket.IO
var socket = io.connect();

// Obtém referências para os elementos HTML relevantes
var canvasContainer = document.getElementById('canvas-container');
var chatText = document.getElementById('chat-text');
var chatInput = document.getElementById('chat-input');
var chatForm = document.getElementById('chat-form');
var ctx = document.getElementById("ctx").getContext("2d");
ctx.font = '30px Arial';

// Define o tamanho do canvas com base no tamanho do contêiner
ctx.canvas.width = canvasContainer.clientWidth;
ctx.canvas.height = (ctx.canvas.width / 16) * 9; // Proporção 16:9

// Atualiza a posição dos jogadores no canvas com base nos dados recebidos do servidor
socket.on('newPositions', function(data) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (data.player) {
        for (var i = 0; i < data.player.length; i++) {
            // console.log("Desenhando jogador " + i);
            var numUser = data.player[i].number;
            var color = data.player[i].color;
            var posXPlayer = Math.round(data.player[i].x);
            var posYPlayer = Math.round(data.player[i].y);

            // Define a cor do jogador
            ctx.fillStyle = color;

            // Desenha um quadrado ao invés de um texto
            ctx.fillRect(posXPlayer, posYPlayer, 30, 30);
        }
    }
});

// Adiciona mensagens de chat recebidas ao elemento de texto do chat
socket.on('addToChat', function(data){
    // var now = new Date();
    // var formattedDateTime = now.toLocaleString();
    // dateTimeSpan.textContent = formattedDateTime;
    // chatText.innerHTML += '<div>' + formattedDateTime + ' - ' + data + '</div>';
    chatText.innerHTML += '<div>' + data + '</div>';
});

// Exibe respostas de avaliação no console
socket.on('evalAnswer', function(data){
    console.log(data);
});

// Envia mensagens de chat para o servidor
chatForm.onsubmit = function(e){
    e.preventDefault();
    if(chatInput.value[0] === '/'){
        socket.emit('evalServer',chatInput.value.slice(1));
    }else{
        socket.emit('sendMsgToServer',chatInput.value);
    }
    chatInput.value = '';
}

// Função para enviar mensagem de reset ao servidor
var reset = function(){
    socket.emit('reset',{msg:'CLICKED RESET!'});
}

// Detecta teclas pressionadas para enviar comandos de movimento ao servidor
document.onkeydown = function(event){
    if(event.keyCode === 87){   // w
        socket.emit('keyPress',{inputId:'up',state:true});
    }else if(event.keyCode === 68){   // d
        socket.emit('keyPress',{inputId:'right',state:true});
    }else if(event.keyCode === 83){   // s
        socket.emit('keyPress',{inputId:'down',state:true});
    }else if(event.keyCode === 65){   // a
        socket.emit('keyPress',{inputId:'left',state:true});
    }
}

// Detecta teclas soltas para enviar comandos de parada ao servidor
document.onkeyup = function(event){
    if(event.keyCode === 87){   // w
        socket.emit('keyPress',{inputId:'up',state:false});
    }else if(event.keyCode === 68){   // d
        socket.emit('keyPress',{inputId:'right',state:false});
    }else if(event.keyCode === 83){   // s
        socket.emit('keyPress',{inputId:'down',state:false});
    }else if(event.keyCode === 65){   // a
        socket.emit('keyPress',{inputId:'left',state:false});
    }
}

// var dateTimeSpan = document.getElementById('date-time');
// var now = new Date();
// var formattedDateTime = now.toLocaleString();
// dateTimeSpan.textContent = formattedDateTime;
