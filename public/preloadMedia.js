// Create an array of media files to preload
const mediaFiles = [
	
	//misc sounds
	{ type: 'audio', src: '/audio/ThrowDarts.mp3' },
	{ type: 'audio', src: '/audio/silence.mp3' },
	{ type: 'audio', src: '/audio/RemoveDarts.mp3' },
	{ type: 'audio', src: '/audio/ReadyToPlay.mp3' },
	{ type: 'audio', src: '/audio/addPlayer.mp3' },
	{ type: 'audio', src: '/audio/removePlayer.mp3' },
	{ type: 'audio', src: '/audio/Plink.mp3' },
	{ type: 'audio', src: '/audio/Player6.mp3' },
	{ type: 'audio', src: '/audio/Player5.mp3' },
	{ type: 'audio', src: '/audio/Player4.mp3' },
	{ type: 'audio', src: '/audio/Player3.mp3' },
	{ type: 'audio', src: '/audio/Player2.mp3' },
	{ type: 'audio', src: '/audio/Player1.mp3' },
	{ type: 'audio', src: '/audio/OhYeah.mp3' },
	{ type: 'audio', src: '/audio/open.mp3' },
	{ type: 'audio', src: '/audio/closed.mp3' },
	
	//score sounds
	{ type: 'audio', src: '/audio/Triple.mp3' },
	{ type: 'audio', src: '/audio/Bullseye.mp3' },
	{ type: 'audio', src: '/audio/DblBullseye.mp3' },
	{ type: 'audio', src: '/audio/Dbl.mp3' },
	{ type: 'audio', src: '/audio/Bust.mp3' },
	{ type: 'audio', src: '/audio/WeHaveAWinner.mp3' },
	
	//miss sounds
	{ type: 'audio', src: '/audio/doh.mp3' },
	{ type: 'audio', src: '/audio/ohNo.mp3' },
	{ type: 'audio', src: '/audio/triedNotMissing.mp3' },
	{ type: 'audio', src: '/audio/soClose.mp3' },
	{ type: 'audio', src: '/audio/AwwTooBad.mp3' },
	{ type: 'audio', src: '/audio/ha-ha.mp3' },
	{ type: 'audio', src: '/audio/miss.mp3' },
	
	//turn sounds
	{ type: 'audio', src: '/audio/fireAway.mp3' },
	{ type: 'audio', src: '/audio/showMe.mp3' },
	{ type: 'audio', src: '/audio/yerTurn.mp3' },
	{ type: 'audio', src: '/audio/yerUp.mp3' },
	{ type: 'audio', src: '/audio/letErFly.mp3' },
	
	//intro music
	{ type: 'audio', src: '/audio/intro.mp3' },
	
	//video
	{ type: 'video', src: '/_gfx/attract.mp4' },
	{ type: 'video', src: '/_gfx/bullseye.mp4' },
	{ type: 'video', src: '/_gfx/double.mp4' },
	{ type: 'video', src: '/_gfx/single.mp4' },
	{ type: 'video', src: '/_gfx/winner.mp4' },
	{ type: 'video', src: '/_gfx/bust.mp4' },
	{ type: 'video', src: '/_gfx/triple.mp4' }
];

// Function to preload a media file and return a promise
function preloadMedia(file) {
    return new Promise((resolve) => {
        let mediaElement;

        if (file.type === 'audio') {
            mediaElement = new Audio();
        } else if (file.type === 'video') {
            mediaElement = document.createElement('video');
        }

        mediaElement.src = file.src;
        mediaElement.preload = 'auto';
		mediaElement.style.display = 'none';

        // Resolve the promise when the media file is loaded
        mediaElement.addEventListener('canplaythrough', resolve);

        document.body.appendChild(mediaElement); // Append to the body to initiate loading
    });
}

// Preload all media files and hide the loading screen when done
Promise.all(mediaFiles.map(preloadMedia)).then(() => {
    document.getElementById('loadingScreen').style.display = 'none';
});