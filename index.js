// Express initializes app to be a function handler that you can supply to an HTTP server(as seen in line4)
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);

// Initialize a new instaince of socket.io by passing the server(the HTTP server) object
const { Server } = require('socket.io');
const io = new Server(server);

// We define a route handler `/` that gets called when we hit out website home.
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('game.html', (req, res) => {
    res.sendFile(__dirname + '/game.html');
})

console.log(__dirname);

const client_room_id_map = {}

// Room Info
/*
    {roomId:{
        clients:[ID_A, ID_B],
        board:Board,
        
    }}
*/
const roomObj = {}

class Board {
    constructor(sizeY, sizeX, n, board) {
        this.x = sizeX;
        this.y = sizeY;
        this.white = 0;
        this.black = 1;
        this.blank = 9;
        this.currentTurn = 0;
        this.n = n;
        this.board = board;
    }

    copy(board) {
        const tmp_board = []
        for (const line of board) tmp_board.push(line.concat());
        return new Board(this.y, this.x, this.n, tmp_board);
    }

    getStone(y, x) {
        return this.board[y][x];
    }

    putStone(y, x) {
        this.board[y][x] = this.currentTurn;
        this.currentTurn ^= 1;
    }
}

// listen on the connection event for incoming sockets
io.on('connection', (socket) => {
    console.log('a user connected');

    // when special event "disconnect event" fired
    socket.on('disconnect', () => {
        console.log('user disconnected');
        // Todo: ユーザーの片方が消えたら部屋を消す
    });

    // join room event
    socket.on('join room', (roomId) => {
        separation()
        console.log("Join Room");
        console.log('user ID:', socket.id);
        console.log('Try: Enter Room Id: ' + roomId);
        if (!(roomId in roomObj)) {
            console.log('Room not found');
            return;
        }
        if (roomObj[roomId].clients.length !== 1) {
            console.log('The room is full');
            return;
        }
        socket.join(roomId);
        roomObj[roomId].clients.push(socket.id);
        console.log(`Entered Room: ${roomObj}`);
        client_room_id_map[socket.id] = roomId;

        const board_tmp = roomObj[roomId].board;
        io.to(roomId).emit("start game", board_tmp.y, board_tmp.x);
        console.log(roomObj);
    });

    // create room event
    socket.on('create room', (sizeX, sizeY, n) => {
        separation()
        console.log("create room");
        console.log('user ID:', socket.id);
        let roomId = undefined;
        for (; ;) {
            roomId = ("0000" + Math.random() * 1000).slice(-4);
            if (roomId in roomObj) { continue; }
            break;
        }
        console.log('created roomId: ' + roomId);
        socket.join(roomId);
        client_room_id_map[socket.id] = roomId;
        console.log(client_room_id_map);

        let tmp_board = [];
        // blank -> 9
        for (var i = 0; i < sizeY; i++) tmp_board.push(Array(sizeX).fill(9));
        roomObj[roomId] = {
            clients: [socket.id],
            board: new Board(sizeY, sizeX, n, tmp_board)
        };
        io.to(roomId).emit("get value", roomId);
    });

    socket.on("check placeable", (y, x) => {
        separation()
        console.log("check placeable");
        const roomId = client_room_id_map[socket.id];
        const currentRoomObj = roomObj[roomId];
        const currentBoard = currentRoomObj.board;
        const client = currentRoomObj.clients;
        if (currentBoard.getStone(y, x) !== currentBoard.blank) return;

        if (client[currentBoard.currentTurn] !== socket.id) return;

        io.to(roomId).emit("draw tile", y, x, currentBoard.currentTurn);
        currentBoard.currentTurn ^= 1;
    })
});

function separation() {
    console.log("-----------------");
}
const PORT = Number(process.env.PORT) || 3000;
// We make the http server listen on port 3000
server.listen(PORT, () => {
    console.log('listening on: ', PORT);
});





