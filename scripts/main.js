const app = {};

app.main = (function(){
    "use strict";
            
    //script scope variables
    
    // ctx variable
    let canvas = document.getElementById('myCanvas');
    let context = canvas.getContext('2d');
    let gradient = context.createLinearGradient(0,0,0,canvas.height);
            
    //play button 
    let playButton;
            
    // checkboxes
    let audioReverb;
    let lightFlashes;
    let headBobbing;
            
    //sliders
    let bassBoost = 0;
    let filmGrainEffect = 0;
    let bobbingSpeed = 5;
            
    //vars for assigning bobbing position
    let bobbingPos = 500;
    let goDown = false;
    
    //vars for rotation
    let rotationAngle = 0;
            
    //var for max radius of the circle
    let maxRadius = 200;
            
    // 2 - elements on the page
    let audioElement,canvasElement;
    
    // 3 - our canvas drawing context
    let drawCtx;
            
    //image vars
    let thomasHelmet = new Image();
    let guymanHelmet = new Image();

    // 4 - our WebAudio context
    let audioCtx;
    
    // 5 - nodes that are part of our WebAudio audio routing graph
    let sourceNode, analyserNode, lowShelfBiquadFilter, gainNode;
    
    // 6 - a typed array to hold the audio frequency dat
    const NUM_SAMPLES = 256;
    // create a new array of 8-bit integers (0-255)
    let audioData = new Uint8Array(NUM_SAMPLES/2);
        
    function setUpWebAudio()
    {
        const AudioContext = window.AudioContext || window.webkistAudioContext;
        audioCtx = new AudioContext();

        // reference to audio element
        audioElement = document.querySelector("audio");
        audioElement.src = "media/bensound-erf.mp3";

        // source that points to audio element
        sourceNode = audioCtx.createMediaElementSource(audioElement);

        // analyser node
        analyserNode = audioCtx.createAnalyser();

        analyserNode.fftSize =NUM_SAMPLES;

        //bass boost node, set to
        lowShelfBiquadFilter = audioCtx.createBiquadFilter();
        lowShelfBiquadFilter.type = "lowshelf";
        lowShelfBiquadFilter.frequency.setValueAtTime(1000, audioCtx.currentTime);
        lowShelfBiquadFilter.gain.setValueAtTime(bassBoost, audioCtx.currentTime);

        // gain volume node
        gainNode = audioCtx.createGain();
        gainNode.gain.value = 1;

        // connect the nodes
        sourceNode.connect(analyserNode);
        analyserNode.connect(lowShelfBiquadFilter);
        lowShelfBiquadFilter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
    }     

    //initial function to be called when the page is loaded
    function init()
    {
        //set up the audio nodes
        setUpWebAudio();

        // set up the canvas
        canvasElement = document.querySelector('canvas');
        drawCtx = canvasElement.getContext('2d');

        // checked boxes
        document.querySelector("#reverb").onchange = e => audioReverb = e.target.checked;
        document.querySelector("#flashes").onchange = e => lightFlashes = e.target.checked;
        document.querySelector("#bobbing").onchange = e => headBobbing = e.target.checked;

        // sliders
        document.querySelector("#bass").onchange = e => bassBoost = e.target.value;
        document.querySelector("#grain").onchange = e => filmGrainEffect = e.target.value;
        document.querySelector("#bobSpeed").onchange = e => bobbingSpeed = e.target.value;
        document.querySelector("#volumeSlider").onchange = e => gainNode.gain.value = e.target.value;

        //play button
        playButton = document.querySelector("#playButton");
        playButton.onclick = e => {
            // check if context is in suspended state (autoplay policy)
            if (audioCtx.state == "suspended") {
                audioCtx.resume();
            }

            if (e.target.dataset.playing == "no") {
                audioElement.play();
                e.target.dataset.playing = "yes";
                playButton.innerHTML = "Pause";
            // if track is playing pause it
            } else if (e.target.dataset.playing == "yes") {
                audioElement.pause();
                e.target.dataset.playing = "no";
                playButton.innerHTML = "Play";
            }

        };
        // if track ends
        audioElement.onended =  _ => {
            playButton.dataset.playing = "no";
        };

        //fullscreen button
        document.querySelector("#fsButton").onclick = _ =>{
            requestFullscreen(canvasElement);
        };

        //set up images
        thomasHelmet.src = "media/dpThomas.png";
        guymanHelmet.src = "media/dpGuyman.png";

        //start the update loop
        update();
    }

    //update called every frame
    function update()
    {         
        // this schedules a call to the update() method in 1/60 seconds
        requestAnimationFrame(update);

        //temp var for current radio selection
        let colorScheme = document.querySelector('input[name="colorScheme"]:checked').value;

        //update the timer based on the audio track's built in timer
        document.querySelector("#timeStamp").innerHTML = Math.round(document.querySelector("audio").currentTime / 60) + ":" + Math.round(document.querySelector("audio").currentTime % 60);

        //clear the previous frame
        drawCtx.clearRect(0,0,1000,1000);

        //draw a grey background
        drawCtx.save();
        drawCtx.fillStyle = "grey";
        drawCtx.fillRect(0,0,1000,1000);
        drawCtx.restore();

        //bass boost
        lowShelfBiquadFilter.frequency.setValueAtTime(1000, audioCtx.currentTime);
        lowShelfBiquadFilter.gain.setValueAtTime(bassBoost, audioCtx.currentTime);

        // gradient background
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#000000');

        context.fillStyle = gradient;
        context.fillRect(0,0,canvas.width, canvas.height);

        //grab the WAVEFORM data AFTER its been altered by the bass boost for drawing purposes
        analyserNode.getByteTimeDomainData(audioData);

        //roatating Bezier curves and rectangle
        drawCtx.save();
        drawCtx.translate(canvas.width / 2, canvas.height / 2);
        drawCtx.rotate(rotationAngle * bobbingSpeed / 200);
        drawCtx.strokeStyle = "black";
        drawCtx.fillStyle = "black";
        drawCtx.fillRect(-25, -25, 50, 50);
        drawCtx.lineWidth = 2;
        for(let i = 0; i < 4; i++){
            drawCtx.rotate((Math.PI * 2) * (i+1 / 4));
            drawCtx.beginPath();
            drawCtx.moveTo(0,0);
            drawCtx.quadraticCurveTo(0,canvas.height, canvas.width, canvas.height);
            drawCtx.stroke();
        }
        drawCtx.restore();
        rotationAngle++;

        // upload some audio
        document.getElementById("fileUp").addEventListener("change", handleAudioUpload, false);
        /**document.getElementById("fileUp").addEventListener('click', function() { context.resume().then(() =>  console.log('Playback resumed') );}**/

        //head bobbing
        if(bobbingPos < 450){
            bobbingPos = 450;
            goDown = true;
        }
        if(bobbingPos > 550){
            bobbingPos = 550;
            goDown = false;
        }
        if(goDown){
            bobbingPos += bobbingSpeed * 1.0; //it needs to be multiplied by a float to work??????
        } else{
            bobbingPos -= bobbingSpeed * 1.0;
        }

        //images
        drawCtx.save();
        drawCtx.scale(.5,.5);
        drawCtx.drawImage(thomasHelmet,0,bobbingPos);
        drawCtx.drawImage(guymanHelmet,1000,bobbingPos);
        drawCtx.restore();

        //temp var for positioning the line relative to top of the screen
        let topSpacing = 75;

        //loop through the WAVEFORM audio data grabbed earlier to draw some stuff on the canvas
        drawCtx.save();
        drawCtx.strokeStyle = "red";
        drawCtx.lineWidth = 5;
        for(let i=0; i<audioData.length; i++) { 

            drawCtx.beginPath();
            drawCtx.moveTo((i / audioData.length * 300) + 100, bobbingPos - audioData[i - 1] * 0.5 + topSpacing);
            drawCtx.lineTo(((i+1) / audioData.length * 300) + 100, bobbingPos - audioData[i] * 0.5 + topSpacing);
            drawCtx.stroke();
            drawCtx.closePath();         
        }

        for(let j=0; j<audioData.length;j++){
            //these can be repurposed for drawing the frequency data as a circle(s), will need a separate for loop after grabbing the frequency data though
//                    //red-ish medium-sized circles
            let percent = audioData[j] / 255;
            let circleRadius = percent * maxRadius; //max radius was not defined, i provided a default value of 200 up near the top to get the app running

            /**drawCtx.beginPath();
            drawCtx.fillStyle = makeColor(255, 111, 111, .34 - percent/3.0);
            drawCtx.arc(canvasElement.width/2, canvasElement.height/2, circleRadius, 0, 2 * Math.PI);
            drawCtx.fill();
            drawCtx.closePath();**/

            //blue-ish circles, bigger, more transparent
            /**drawCtx.beginPath();
            drawCtx.fillStyle = makeColor(0, 0, 255, .1 - percent/10.0);
            drawCtx.arc(canvasElement.width/2, canvasElement.height/2, circleRadius * 1.5, 0, 2 * Math.PI);
            drawCtx.fill();
            drawCtx.closePath();**/

            //yellow-ish circles, smaller
            drawCtx.beginPath();
            drawCtx.fillStyle = "yellow"; //was using makeColor here which is not a function currently defined, replaced with yellow so the app can run
            drawCtx.arc(canvasElement.width/2, canvasElement.height/2, circleRadius * .5, 0, 2 * Math.PI);
            drawCtx.fill();
            drawCtx.closePath();   
        }
        drawCtx.restore();

        // Bitmap Manipulation
        let imageData = drawCtx.getImageData(0, 0, 1000, 1000);
        let data = imageData.data;
        let length = data.length;
        // Iterate through each pixel
        for (let i = 0; i < length; i +=4) {
            //grain
            if (Math.random() < filmGrainEffect * 0.01){
                data[i] = data[i+1] = data[i+2] = 0;
                //console.log("Getting grainy!");
            }

            //color scheme
            switch(colorScheme){
                case "grayscale":
                    data[i] = data[i + 1] = data[i + 2] = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    break;
                case "neon":
                    if(data[i] > data[i + 1] && data[i] > data[i + 2]){
                        data[i] += 75;
                    }
                    else if(data[i + 1] > data[i] && data[i + 1] > data[i + 2]){
                        data[i + 1] += 75;
                    }
                    else if(data[i + 2] > data[i + 1] && data[i + 2] > data[i]){
                        data[i + 2] += 75;
                    }
                    break;
                case "flat":
                    data[i + 2] = data[i + 1] = 0;     
                    break;
                default:
                    break;
            }
        }	// end for

        // copy data back to canvas
        drawCtx.putImageData(imageData, 0, 0);
    }

    //helper function for full-screening
    function requestFullscreen(element) {
        if (element.requestFullscreen) {
          element.requestFullscreen();
        } else if (element.mozRequestFullscreen) {
          element.mozRequestFullscreen();
        } else if (element.mozRequestFullScreen) { // camel-cased 'S' was changed to 's' in spec
          element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
          element.webkitRequestFullscreen();
        }
        // .. and do nothing if the method is not supported
    };

    // function to create a music player
    function handleAudioUpload(event)
    {
        let files = event.target.files;
        $("#audioSrc").attr("src",URL.createObjectURL(files[0]));
        document.getElementById("audioCont").load();
    }

    // clicking the flashing light button flashes the light on the screen
    //$(document).click(function(){$("#flashes").toggle("pulsate");});
    
    //return any relevant functions or vars that need to be used globally
    return{
        init: init
    };     
})();

app.main.init();