const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');

const fs = require('fs');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

const server = http.createServer(app);
const io = socketIo(server);

//Game variables
let latestData = {}; // Variable to store the latest data
let isStarted = 0;
let numThrows = 0;
let scores = [301, 301, 301, 301, 301, 301];
let currentPlayer = 1;
let numberOfPlayers = 6;
let currThrow = 1;

// Endpoint to receive data
app.post('/data', (req, res) => {
    latestData = req.body;
    if (latestData.playerNum == 0 && latestData.point == 0 && latestData.msg == "bigRed") {
        console.log('button pressed');
    } else {
        console.log(`Received data: Player Number = ${latestData.playerNum}, Score = ${latestData.point}, Message = "${latestData.msg}"`);

        // Emit the received data to all connected clients
        io.emit('updateData', latestData);
    }

    res.send('Data received');
});

io.on('connection', (socket) => {
    console.log('A client connected');

    // Send the latest data to the newly connected client
    socket.emit('updateData', latestData);
	socket.emit('gameDetails', { throwsLeft: numThrows, currPlayer: currentPlayer, totalPlayers: numberOfPlayers, scores: scores });

    socket.on('newGame', () => {
        scores = Array(numberOfPlayers).fill(301);
		currentPlayer = 1;
		currThrow = 1;
		io.emit('alertUpdate', 'Throw Darts');
		io.emit('bigMsgUpdate', 'Let\'s Play!');
		updateScores();
		updateTurn();
    });

    socket.on('storeScores', (gameData) => {

        //read existing file
        const fileData = JSON.parse(fs.readFileSync('public/scoreHistory.json'));
        fileData.push(gameData);

        //write out to file with appended scores
        fs.writeFileSync('public/scoreHistory.json', JSON.stringify(fileData, null, 2));
    });

    socket.on('message', (msg) => {
        //console.log(msg);
        io.emit('alertUpdate', msg);
    });

    socket.on('bigMsg', (msg) => {
        //console.log(msg);
        io.emit('bigMsgUpdate', msg);
    });

    socket.on('throw', (data) => {
        if (isStarted == 1) {
            console.log(`Player ${data.player} scored ${data.score}`);
            io.emit('alertUpdate', msg);
            numThrows++;
            if (numThrows > 3) {
                //reset numThrows to 0 and go to next player
                io.emit('scoreUpdate', data);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('A client disconnected');
    });
});

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
