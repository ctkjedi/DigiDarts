// Create an array of media files to preload
const mediaFiles = [
    { type: 'audio', src: '/audio/Bullseye.mp3' },
	{ type: 'audio', src: '/audio/WeHaveAWinner.mp3' },
	{ type: 'audio', src: '/audio/Triple.mp3' },
	{ type: 'audio', src: '/audio/ThrowDarts.mp3' },
	{ type: 'audio', src: '/audio/silence.mp3' },
	{ type: 'audio', src: '/audio/RemoveDarts.mp3' },
	{ type: 'audio', src: '/audio/ReadyToPlay.mp3' },
	{ type: 'audio', src: '/audio/Plink.mp3' },
	{ type: 'audio', src: '/audio/Player6.mp3' },
	{ type: 'audio', src: '/audio/Player5.mp3' },
	{ type: 'audio', src: '/audio/Player4.mp3' },
	{ type: 'audio', src: '/audio/Player3.mp3' },
	{ type: 'audio', src: '/audio/Player2.mp3' },
	{ type: 'audio', src: '/audio/Player1.mp3' },
	{ type: 'audio', src: '/audio/OhYeah.mp3' },
	{ type: 'audio', src: '/audio/DblBullseye.mp3' },
	{ type: 'audio', src: '/audio/Dbl.mp3' },
	{ type: 'audio', src: '/audio/Bust.mp3' },
	{ type: 'video', src: '/_gfx/bullseye.webm' },
	{ type: 'video', src: '/_gfx/double.webm' },
	{ type: 'video', src: '/_gfx/single.webm' },
	{ type: 'video', src: '/_gfx/triple.webm' }
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

        // Resolve the promise when the media file is loaded
        mediaElement.addEventListener('canplaythrough', resolve);

        document.body.appendChild(mediaElement); // Append to the body to initiate loading
    });
}

// Preload all media files and hide the loading screen when done
Promise.all(mediaFiles.map(preloadMedia)).then(() => {
    document.getElementById('loadingScreen').style.display = 'none';
});