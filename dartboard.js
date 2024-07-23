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

const zones = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
const cricketPoints = [25,20,19,18,17,16,15];



//Game variables
let missSound = ['doh','ohNo','triedNotMissing','soClose','AwwTooBad','miss'];
let turnSound = ['ThrowDarts','fireAway','showMe','yerTurn','yerUp','letErFly'];

let players = [
    { name: 'Player 1', score: 0, isTurn: false, 15:{hits: 0, status: 0}, 16:{hits: 0, status: 0}, 17:{hits: 0, status: 0}, 18:{hits: 0, status: 0}, 19:{hits: 0, status: 0}, 20:{hits: 0, status: 0}, 25:{hits: 0, status: 0}},
    { name: 'Player 2', score: 0, isTurn: false, 15:{hits: 0, status: 0}, 16:{hits: 0, status: 0}, 17:{hits: 0, status: 0}, 18:{hits: 0, status: 0}, 19:{hits: 0, status: 0}, 20:{hits: 0, status: 0}, 25:{hits: 0, status: 0}} 
];

//temp test array
/* let players = [
    { name: 'Player 1', score: 80, isTurn: false, 15:{hits: 3, status: 1}, 16:{hits: 3, status: 1}, 17:{hits: 3, status: 1}, 18:{hits: 3, status: 1}, 19:{hits: 3, status: 1}, 20:{hits: 3, status: 1}, 25:{hits: 3, status: 1}},
    { name: 'Player 2', score: 90, isTurn: false, 15:{hits: 0, status: 0}, 16:{hits: 0, status: 0}, 17:{hits: 0, status: 0}, 18:{hits: 0, status: 0}, 19:{hits: 0, status: 0}, 20:{hits: 0, status: 0}, 25:{hits: 0, status: 0}}
]; */

let gameType = '301';
let currentPlayer = 0;
let latestData = {}; // Variable to store the latest data
let isStarted = 0;
let isPaused = 1;
let numThrows = 0;
let currThrow = 1;
let baseScore = 0;
let isWinner = 0;
var startScore;


function getGameState() {
	//console.log('game state sending');
	return {
		Players: players,
        currState: isStarted,
        ifPaused: isPaused,
		isStarted: isStarted,
		gameType: gameType,
        currPlayer: currentPlayer + 1,
		isWinner: isWinner
    };
}

// HTTP POST endpoint to receive data from Arduino
app.post('/data', (req, res) => {
    const data = req.body;
	console.log(req.body);
    //sends arduino confirmation
    res.json({
        message: 'Point received'
    });
	
    if (typeof data.point=='string') data.point = Number(data.point);
	
	if(currThrow==1) startScore = players[currentPlayer].score;
    
	//if game hasn't started and red button is pressed, start game
    if (!isStarted && data.point == 0 && data.message == 'bigRed') {
		console.log('Start game');
        newGame();
    }else if(isStarted && data.point==0 && data.message=='bigRed' && isPaused==0){
		playerMiss();
	}else if (isStarted == 1 && data.point == 0 && isPaused == 1 && data.message == 'bigRed') {
        //if player has thrown 3 darts and button is pressed, go to next player
        currentPlayer = (currentPlayer + 1) % players.length;
        players.forEach((player, index) => player.isTurn = index === currentPlayer);
        currThrow = 1;
        isPaused = 0;
        io.emit('playSound', 'Player' + String(currentPlayer + 1));
        io.emit('bigMsgUpdate', '')
        setTimeout(function () {
			var randSound = Math.floor(Math.random() * turnSound.length);
			io.emit('playSound',turnSound[randSound]);
			}, 500);
        io.emit('alertUpdate', players[currentPlayer].name + ', Throw Darts');
        io.emit('gameState', getGameState());
    }else if(isStarted==1 && data.point > 0 && !isPaused) {
		
		//if the game has started and a point is received, score and play media accordingly.
        var thisScore = '';
		var thisMult = '';
        var thisAngle;
		io.emit('playSound', 'Plink');
		

            //score and play media accordingly

            switch (data.message) {
            case 'TRIPLE':
                io.emit('playSound', 'Triple');
				thisMult=3;
                thisScore = 'TRIPLE! 3 x ' + (data.point / 3) + ' = ' + data.point;
                thisAngle = zones.indexOf(data.point / 3) * 18;
                io.emit('playVideo', 'triple.webm', thisAngle);
                break;
            case 'DOUBLE':
                io.emit('playSound', 'Dbl');
				thisMult=2;
                thisScore = 'DOUBLE! 2 x ' + (data.point / 2) + ' = ' + data.point;
                thisAngle = zones.indexOf(data.point / 2) * 18;
                io.emit('playVideo', 'double.webm', thisAngle);
                break;
            case 'BULL':
                io.emit('playSound', 'Bullseye');
                thisScore = 'BULLSEYE! ' + data.point;
				thisMult=1;
                thisAngle = zones.indexOf(data.point) * 18;
				io.emit('playVideo', 'bullseye.webm', 0);
                break;
            case 'DBLBULL':
                io.emit('playSound', 'DblBullseye');
				thisMult=2;
                thisScore = 'DOUBLE BULL! 2 x ' + (data.point / 2) + ' = ' + data.point;
               io.emit('playVideo', 'bullseye.webm', 0);
                break;
            default:
                thisAngle = zones.indexOf(data.point) * 18;
				io.emit('playVideo', 'single.webm', thisAngle);
				thisMult=1;
                thisScore = data.point;
            }
			
			switch (gameType){
				case 'cricket':
				//if is cricket zone check if open or closed and add hash or score accordingly
					var zoneHit = data.point/thisMult;
					console.log('Zone hit: '+zoneHit);
					
					if(cricketPoints.includes(zoneHit) && players[currentPlayer][zoneHit].status!=2){
						// if the point is in the array and not closed for everyone
						for(let i=1;i<=thisMult;i++){
							//if the players point is open, add to their score
							if(players[currentPlayer][zoneHit].status==1){
								players[currentPlayer].score += zoneHit;
							}
							//cycle through the number of times hit (multiplier)
							if(players[currentPlayer][zoneHit].hits<3){
								//if the player has hit the zone less than 3 times, increase their hit count
								players[currentPlayer][zoneHit].hits++;
								if(players[currentPlayer][zoneHit].hits==3){
									//if this is their third hit,open their point, then check to see if all players are open
									players[currentPlayer][zoneHit].status = 1;
									closePoint(zoneHit);
									if(players[currentPlayer][zoneHit].status != 2){
										//if the point is not closed, but is their third hit, open the point and play a sound
										setTimeout(function () {
											io.emit('playSound', 'open');
										}, 500);
									}
								}
							}
						}
					}
					cricketWinCheck(currentPlayer);
					break;
				default:
					players[currentPlayer].score -= data.point;
					break;
			}
			
            io.emit('bigMsgUpdate', thisScore);

            //detecs bust and returns score to when turn started
            if (players[currentPlayer].score < 0) {
                players[currentPlayer].score = startScore;
				setTimeout(function () {
                   io.emit('playVideo', 'bust.webm', 0);
                }, 50);
                isPaused = 1;
				currThrow=4;
                io.emit('alertUpdate', 'Remove Darts, Press Button to Continue');
                io.emit('bigMsgUpdate', thisScore + ' - BUST!');
                setTimeout(function () {
                    io.emit('playSound', 'Bust');
                }, 10);
                if(currThrow<3){
					setTimeout(function () {
						io.emit('playSound', 'RemoveDarts');
					}, 2000);
				}
            }

            currThrow++;

            if (currThrow > 3) {
                isPaused = 1;
                io.emit('alertUpdate', 'Remove Darts, Press Button to Continue');
                setTimeout(function () {
                    io.emit('playSound', 'RemoveDarts');
                }, 500);
            }
			
		// check for winner
        if (players[currentPlayer].score == 0 && gameType!='cricket') {
            winner(currentPlayer);
		}
    }
    io.emit('gameState', getGameState());
});

// Serve the main UI
app.get('/', (req, res) => {
		res.sendFile(__dirname + '/public/mainBoard.html');
});

// Serve the top scores page
app.get('/scores', (req, res) => {
    res.sendFile(__dirname + '/public/displayScores.html');
});

// Serve the name entry page
app.get('/control', (req, res) => {
    res.sendFile(__dirname + '/public/gameControls.html');
});

io.on('connection', (socket) => {
    console.log('A client connected');

    // Send the latest data to the newly connected client
    socket.emit('gameState', getGameState());
    socket.emit('updateData', latestData);

    socket.on('newGame', () => {
        newGame();
    });

	socket.on('game301',() => {
		gameType = '301';
		newGame();
	});
	
	socket.on('gameCricket',() => {
		gameType = 'cricket';
		newGame();
	});
	
	socket.on('calibrate', () => {
		io.emit('calibrate');
		console.log('calibrate');
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
        io.emit('alertUpdate', msg);
    });

    socket.on('bigMsg', (msg) => {
        io.emit('bigMsgUpdate', msg);
    });
	
	socket.on('skipTo',(playerID)=> {
		if(isStarted){
			currentPlayer = playerID;
			currThrow=1;
			isPaused=0;
			players.forEach((player, index) => player.isTurn = index === currentPlayer);
			io.emit('alertUpdate', players[currentPlayer].name + ', Throw Darts');
			io.emit('bigMsgUpdate', '');
			io.emit('gameState', getGameState());
			io.emit('playSound', 'Player' + String(currentPlayer + 1));
			setTimeout(function () {
				var randSound = Math.floor(Math.random() * turnSound.length);
				io.emit('playSound',turnSound[randSound]);
			}, 500);
		}
	});

    socket.on('throw', (score) => {
        players[currentPlayer].score -= score;
        if (players[currentPlayer].score < 0)
            players[currentPlayer].score = 0;
        currentPlayer = (currentPlayer + 1) % players.length;
        players.forEach((player, index) => player.isTurn = index === currentPlayer);
        io.emit('gameState', getGameState());
    });
	
	socket.on('setPlayers', (playerNames) => {
		players = players.map((player, index) => {
	    if (index < playerNames.length) {
	        player.name = playerNames[index];
	    }
	    return player;
	});

        io.emit('gameState', getGameState());
    });
	
	socket.on('getPlayers', () => {
        socket.emit('playersData', players);
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
	
	if(gameType=='cricket' && players.length>4){
		for(i=0;i<=players.length-4;i++){
			players.pop();
		}
	}
    players.forEach(player => {
		switch (gameType){
			case '301':
				baseScore = 301;
				break;
			case '401':
				baseScore = 401;
				break;
			case '501':
				baseScore = 501;
				break;
			case 'cricket':
				baseScore = 0;
				break;
		}
		player.score = baseScore;
		
		player[15]= {hits: 0, status: 0};
		player[16]= {hits: 0, status: 0};
		player[17]= {hits: 0, status: 0};
		player[18]= {hits: 0, status: 0};
		player[19]= {hits: 0, status: 0};
		player[20]= {hits: 0, status: 0};
		player[25]= {hits: 0, status: 0};
	});
    currentPlayer = 0;
    isStarted = 1;
    currThrow = 1;
    isPaused = 0;
	isWinner=0;
    players.forEach((player, index) => player.isTurn = index === currentPlayer);
    io.emit('alertUpdate', players[currentPlayer].name + ', Throw Darts');
    io.emit('bigMsgUpdate', '');
    io.emit('gameState', getGameState());
	io.emit('playSound','intro');
    setTimeout(function () {
		io.emit('playSound', 'Player' + String(currentPlayer + 1));
		}, 2500);
	io.emit('hideAttract');
    setTimeout(function () {
        var randSound = Math.floor(Math.random() * turnSound.length);
		io.emit('playSound',turnSound[randSound]);
    }, 3000);
}

function nextPlayer() {
    if (currThrow < 4) {
        isPaused = 1;
        io.emit('alertUpdate', 'Remove Darts, Press Button to Continue');
        io.emit('playSound', 'RemoveDarts');
        io.emit('bigMsgUpdate', '');
        currThrow = 4;
    } else {
        isPaused = 0;
		io.emit('bigMsgUpdate', '');
        currentPlayer = (currentPlayer + 1) % players.length;
        players.forEach((player, index) => player.isTurn = index === currentPlayer);
        io.emit('playSound', 'Player' + String(currentPlayer + 1));
        setTimeout(function () {
            var randSound = Math.floor(Math.random() * turnSound.length);
			io.emit('playSound',turnSound[randSound]);
        }, 500);
        currThrow = 1;
    }
    io.emit('gameState', getGameState());
}

function addPlayer() {
	switch(gameType){
		
		case 'cricket':
			var maxPlayers = 4;
			break;
			
		default: 
			var maxPlayers = 6;
			break;		
	}
	
    if (players.length < maxPlayers) {
		io.emit('playSound', 'addPlayer');
		players.push({ name: 'Player '+(players.length+1), score: baseScore, isTurn: false, 15:{hits: 0, status: 0}, 16:{hits: 0, status: 0}, 17:{hits: 0, status: 0}, 18:{hits: 0, status: 0}, 19:{hits: 0, status: 0}, 20:{hits: 0, status: 0}, 25:{hits: 0, status: 0}});
		io.emit('gameState', getGameState());
		//io.emit('playersData', players);
    }
}

function removePlayer() {
    if (players.length > 1) {
		players.pop();
        if (currentPlayer >= players.length) {
            currentPlayer = 0;
        }

		io.emit('playSound', 'removePlayer');
		io.emit('gameState', getGameState());
		io.emit('playersData', players);
    }
}

function playerMiss(){
	//if the game has started and the current player missed, red button pressed - go to next Player
		currThrow = 4;
		isPaused = 1;
		var randSound = Math.floor(Math.random() * missSound.length);
        io.emit('bigMsgUpdate', 'Missed!');
		io.emit('playSound',missSound[randSound]);
        io.emit('alertUpdate', 'Remove Darts, Press Button to Continue');
        setTimeout(function () {
            io.emit('playSound', 'RemoveDarts');
        }, 1100);
}

function closePoint(thisPoint){
	console.log('check close point: ' + thisPoint);
	console.log(players);
	let numOpen = players.filter(totalOpen=> totalOpen[thisPoint].status===1);
	console.log(numOpen);
	if(numOpen.length == players.length){
		setTimeout(function () {
			io.emit('playSound', 'closed');
		}, 500);
		console.log('closing point: ' + thisPoint);
		players.forEach(player => {
			player[thisPoint].status = 2;
		});
	}
}

function cricketWinCheck(thisPlayer){
	console.log('Win check');
	let openTotal=0;
	//find highest score
	var highScore = Math.max.apply(Math, players.map(function(o){return o.score;}));
	var winPlayer = players.findIndex(p => p.score == highScore);
	//if the current player has the highest score, check to see if they've opened all their points (or they've been closed)
	if(winPlayer==thisPlayer){
		for(i=0;i<cricketPoints.length;i++){
			//if the player has either opened all their points or point is closed, add to total
			if(players[thisPlayer][cricketPoints[i]].status==1 || players[thisPlayer][cricketPoints[i]].status==2){
				openTotal++;
			}
		}
		//if the total is 7, all points have been made, announce winner
		if (openTotal==7){
			winner(thisPlayer);
		}
	}
}

function winner(playerNum) {
	isWinner=1;
	//give a moment for the zone animation and dart hit to finish
	setTimeout(function () {
		io.emit('playSound', 'WeHaveAWinner');
        io.emit('playVideo', 'winner.webm', 0);
		var msg = players[playerNum].name+ ' wins!';
		console.log(msg);
		io.emit('bigMsgUpdate', msg);
		io.emit('alertUpdate', 'Press the button to start a new game');
		isPaused = 0;
		isStarted = 0;
    }, 500);
}
