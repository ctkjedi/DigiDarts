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
let players = [{
        score: 301,
        isTurn: true
    }, {
        score: 301,
        isTurn: false
    }, {
        score: 301,
        isTurn: false
    }, {
        score: 301,
        isTurn: false
    }, {
        score: 301,
        isTurn: false
    }, {
        score: 301,
        isTurn: false
    },
];
let numberOfPlayers = 6;
let currentPlayer = 0;

function getGameState() {
    return {
        players: players.slice(0, numberOfPlayers)
    };
}

let latestData = {}; // Variable to store the latest data
let isStarted = 0;
let numThrows = 0;
let currThrow = 1;

// HTTP POST endpoint to receive data from Arduino
app.post('/data', (req, res) => {
  const data = req.body;
  console.log('Received JSON data:', data);
  res.json({ message: 'Data received successfully' });
    /* if (typeof point === 'number' && point >= 0 && point <= 180) {
        players[currentPlayer].score -= point;
        if (players[currentPlayer].score < 0) players[currentPlayer].score = 0;
        currentPlayer = (currentPlayer + 1) % numberOfPlayers;
        players.forEach((player, index) => player.isTurn = index === currentPlayer);
        io.emit('gameState', getGameState());
        res.status(200).send('Score updated');
    } else {
        res.status(400).send('Invalid score');
    } */
});

// Serve the main UI
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/UI.html');
});

// Serve the top scores page
app.get('/scores', (req, res) => {
    res.sendFile(__dirname + '/public/displayScores.html');
});

io.on('connection', (socket) => {
    console.log('A client connected');

    // Send the latest data to the newly connected client
    socket.emit('gameState', getGameState());
    socket.emit('updateData', latestData);
    

    socket.on('newGame', () => {
        players.forEach(player => player.score = 301);
        currentPlayer = 0;
        players.forEach((player, index) => player.isTurn = index === currentPlayer);
        io.emit('gameState', getGameState());
        console.log("New game started");
    });

    socket.on('addPlayer', () => {
        if (numberOfPlayers < 6) {
            numberOfPlayers++;
            players[numberOfPlayers - 1] = {
                score: 301,
                isTurn: false
            };
			console.log("player added");
            io.emit('gameState', getGameState());
        }
    });

    socket.on('removePlayer', () => {
        if (numberOfPlayers > 1) {
            numberOfPlayers--;
            if (currentPlayer >= numberOfPlayers) {
                currentPlayer = 0;
            }
			console.log("player removed");
            io.emit('gameState', getGameState());
        }
    });
	
	 socket.on('nextPlayer', () => {
        currentPlayer = (currentPlayer + 1) % numberOfPlayers;
        players.forEach((player, index) => player.isTurn = index === currentPlayer);
        io.emit('gameState', getGameState());
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

    socket.on('throw', (score) => {
        players[currentPlayer].score -= score;
        if (players[currentPlayer].score < 0)
            players[currentPlayer].score = 0;
        currentPlayer = (currentPlayer + 1) % numberOfPlayers;
        players.forEach((player, index) => player.isTurn = index === currentPlayer);
        io.emit('gameState', getGameState());
    });

    socket.on('disconnect', () => {
        console.log('A client disconnected');
    });
});

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

function updateScores() {
    for (let i = 0; i < 6; i++) {
        const playerDiv = document.querySelector(`#player${i + 1}`);
        if (i < numberOfPlayers) {
            playerDiv.style.display = 'flex';
            playerDiv.querySelector('.score').textContent = scores[i];
        } else {
            playerDiv.style.display = 'none';
        }
    }
}
