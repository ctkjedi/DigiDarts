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

const zones = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

//Game variables
let players = [
    { name: 'Player 1', score: 301, isTurn: false },
    { name: 'Player 2', score: 301, isTurn: false },
    { name: 'Player 3', score: 301, isTurn: false },
    { name: 'Player 4', score: 301, isTurn: false },
    { name: 'Player 5', score: 301, isTurn: false },
    { name: 'Player 6', score: 301, isTurn: false }
];

let numberOfPlayers = 6;
let currentPlayer = 0;
let latestData = {}; // Variable to store the latest data
let isStarted = 0;
let isPaused = 0;
let numThrows = 0;
let currThrow = 1;

function getGameState() {
    return {
        players: players.slice(0, numberOfPlayers),
        currState: isStarted,
        ifPaused: isPaused,
        currPlayer: currentPlayer + 1
    };
}

// HTTP POST endpoint to receive data from Arduino
app.post('/data', (req, res) => {
    const data = req.body;
    //sends arduino confirmation
    res.json({
        message: 'Point received'
    });
    console.log('Received JSON data:', data);

    //if game hasn't started and red button is pressed, start game
    if (!isStarted && data.point == 0 && data.message == 'bigRed') {
        newGame();
        console.log('Game Started from dartboard');
    }

    //if player has thrown 3 darts and button is pressed, go to next player
    if (isStarted == 1 && data.point == 0 && isPaused == 1 && data.message == 'bigRed') {
        console.log('next player');
        currentPlayer = (currentPlayer + 1) % numberOfPlayers;
        players.forEach((player, index) => player.isTurn = index === currentPlayer);
        currThrow = 1;
        isPaused = 0;
        io.emit('playSound', 'Player' + String(currentPlayer + 1));
        io.emit('bigMsgUpdate', '')
        setTimeout(function () {
            io.emit('playSound', 'ThrowDarts');
        }, 500);
        io.emit('alertUpdate', 'Player ' + String(currentPlayer + 1) + ', Throw Darts');
        io.emit('gameState', getGameState());
    }

    //if the game has started and a point is received, score and play media accordingly.
    if (isStarted && data.point > 0 && !isPaused) {
        var startingScore = players[currentPlayer].score;
        var thisScore = '';
        var thisAngle;
        players[currentPlayer].score -= data.point;

        //first check for winner
        if (players[currentPlayer].score == 0) {
            console.log('winner');
            winner(String(currentPlayer + 1));
        } else {
            //continue scoring and playing media accordingly

            switch (data.message) {
            case 'TRIPLE':
                io.emit('playSound', 'Triple');
                thisScore = 'TRIPLE! 3 x ' + (data.point / 3) + ' = ' + data.point;
                thisAngle = zones.indexOf(data.point / 3) * 18;
                io.emit('playVideo', 'triple.webm', thisAngle);
                break;
            case 'DOUBLE':
                io.emit('playSound', 'Dbl');
                thisScore = 'DOUBLE! 2 x ' + (data.point / 2) + ' = ' + data.point;
                thisAngle = zones.indexOf(data.point / 2) * 18;
                io.emit('playVideo', 'double.webm', thisAngle);
                break;
            case 'BULL':
                io.emit('playSound', 'Bullseye');
                thisScore = 'BULLSEYE! ' + data.point;
                thisAngle = zones.indexOf(data.point) * 18;
                io.emit('playVideo', 'bullseye.webm', 0);
                break;
            case 'DBLBULL':
                io.emit('playSound', 'DblBullseye');
                thisScore = 'DOUBLE BULL! 2 x ' + (data.point / 2) + ' = ' + data.point;
                io.emit('playVideo', 'bullseye.webm', 0);
                break;
            default:
                io.emit('playSound', 'Plink');
                thisAngle = zones.indexOf(data.point) * 18;
                io.emit('playVideo', 'single.webm', thisAngle);
                thisScore = data.point;
            }

            io.emit('bigMsgUpdate', thisScore);

            //detecs bust and returns score to when turn started
            if (players[currentPlayer].score < 0) {
                players[currentPlayer].score = startingScore;

                isPaused = 1;
                io.emit('alertUpdate', 'Remove Darts, Press Button to Continue');
                io.emit('bigMsgUpdate', 'BUST!');
                setTimeout(function () {
                    io.emit('playSound', 'Bust');
                }, 500);
                setTimeout(function () {
                    io.emit('playSound', 'RemoveDarts');
                }, 1000);
            }

            currThrow++;

            if (currThrow > 3) {
                isPaused = 1;
                io.emit('alertUpdate', 'Remove Darts, Press Button to Continue');
                setTimeout(function () {
                    io.emit('playSound', 'RemoveDarts');
                }, 500);
            }
        }

    }
    io.emit('gameState', getGameState());
});

// Serve the main UI
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/UI.html');
});

// Serve the top scores page
app.get('/scores', (req, res) => {
    res.sendFile(__dirname + '/public/displayScores.html');
});

// Serve the name entry page
app.get('/players', (req, res) => {
    res.sendFile(__dirname + '/public/playerNames.html');
});

io.on('connection', (socket) => {
    console.log('A client connected');

    // Send the latest data to the newly connected client
    socket.emit('gameState', getGameState());
    socket.emit('updateData', latestData);

    socket.on('newGame', () => {
        newGame();
    });

    socket.on('addPlayer', () => {
        addPlayer();
    });

    socket.on('removePlayer', () => {
        removePlayer();
    });

    socket.on('nextPlayer', () => {
        nextPlayer();
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
	
	socket.on('setPlayers', (newPlayers) => {
        players = newPlayers.map((name, index) => ({
            name,
            score: 301,
            isTurn: index === currentPlayer
        }));
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

function newGame() {
    players.forEach(player => player.score = 301);
    currentPlayer = 0;
    isStarted = 1;
    currThrow = 1;
    isPaused = 0;
    players.forEach((player, index) => player.isTurn = index === currentPlayer);
    io.emit('alertUpdate', 'Player ' + String(currentPlayer + 1) + ', Throw Darts');
    io.emit('bigMsgUpdate', '');
    io.emit('gameState', getGameState());
    io.emit('playSound', 'Player' + String(currentPlayer + 1));
    setTimeout(function () {
        io.emit('playSound', 'ThrowDarts');
    }, 500);
    console.log("New game started");
}

function nextPlayer() {
    console.log(currThrow);
    if (currThrow < 4) {
        isPaused = 1;
        io.emit('alertUpdate', 'Remove Darts, Press Button to Continue');
        io.emit('playSound', 'RemoveDarts');
        io.emit('bigMsgUpdate', '');
        currThrow = 4;
    } else {
        isPaused = 0;
        currentPlayer = (currentPlayer + 1) % numberOfPlayers;
        players.forEach((player, index) => player.isTurn = index === currentPlayer);
        io.emit('playSound', 'Player' + String(currentPlayer + 1));
        setTimeout(function () {
            io.emit('playSound', 'ThrowDarts');
        }, 500);
        currThrow = 1;
    }
    io.emit('gameState', getGameState());
}

function addPlayer() {
    if (numberOfPlayers < 6) {
        numberOfPlayers++;
        players[numberOfPlayers - 1] = {
            score: 301,
            isTurn: false
        };
        console.log("player added");
        io.emit('gameState', getGameState());
    }
}

function removePlayer() {
    if (numberOfPlayers > 1) {
        numberOfPlayers--;
        if (currentPlayer >= numberOfPlayers) {
            currentPlayer = 0;
        }
        console.log("player removed");
        io.emit('gameState', getGameState());
    }
}

function winner(playenNum) {
    io.emit('playSound', 'WeHaveAWinner');
    io.emit('bigMsgUpdate', 'Player ' + playenNum + ' wins!');
    isPaused = 1;
    isStarted = 0;
}
