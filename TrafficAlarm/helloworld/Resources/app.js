//*****************************************************
// Author: Loren W. Brown
// Date: Aug 5, 2014
// Title: Traffic Alarm
// Funtion: Wakes you up sooner when traffic is bad
// Funtion: Make a personalized Alarm Tone
//*****************************************************

//********************
// Setup
//********************

// this sets the background color of the master UIView (when there are no windows/tab groups on it)
Titanium.UI.setBackgroundColor('#000');

//Sets default anotation location
if (Titanium.App.Properties.getDouble("myLat", 0) == 0 || Titanium.App.Properties.getDouble("myLon", 0) == 0){
	Titanium.App.Properties.setDouble("myLat", 44.563857);
  	Titanium.App.Properties.setDouble("myLon", -123.279465);
}

//Set default user location
if (Titanium.App.Properties.getDouble("userLat", 0) == 0 || Titanium.App.Properties.getDouble("userLon", 0) == 0){
	Titanium.App.Properties.setDouble("myLat", 44.563857);
  	Titanium.App.Properties.setDouble("myLon", -123.279465);
}

//Get initial delay
getDelay();

// Set up Alarm
var myAlarm = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory,'user.wav'); //creates .wav file
var player  = Ti.Media.createSound({url: myAlarm.nativePath});
Titanium.App.Properties.setBool("alarmState", false);
var file;

// Set up Recorder
Titanium.Media.audioSessionMode = Ti.Media.AUDIO_SESSION_MODE_PLAY_AND_RECORD;
var recording = Ti.Media.createAudioRecorder();
recording.compression = Ti.Media.AUDIO_FORMAT_ULAW;
recording.format = Ti.Media.AUDIO_FILEFORMAT_WAVE;

//*********************
// Create Map Window
//*********************

var Map = require('ti.map');

var oregonState = Map.createAnnotation({
	latitude:44.563857, 
	longitude:-123.279465,
    title:"Oregon State University",
    subtitle:'Corvallis, OR',
    draggable: false,
    pincolor:Map.ANNOTATION_ORANGE,
    myid:1 // Custom property to uniquely identify this annotation.
});

var trafficPoint = Map.createAnnotation({
	latitude: Titanium.App.Properties.getDouble("myLat"), 
	longitude:Titanium.App.Properties.getDouble("myLon"),
    title:"Your Destination",
    subtitle:'Lat: '+(Titanium.App.Properties.getDouble("myLat").toFixed(3))+', Lon: '+(Titanium.App.Properties.getDouble("myLon").toFixed(3)),
    pincolor:Map.ANNOTATION_ORANGE,
    draggable: true,
    myid:2 // Custom property to uniquely identify this annotation.
});

var mapview = Map.createView({
	mapType:Map.NORMAL_TYPE,
	region: {latitude:Titanium.App.Properties.getDouble("myLat"),
			longitude:Titanium.App.Properties.getDouble("myLon"),
            latitudeDelta:1.00, longitudeDelta:1.00},
    animate:true,
    regionFit:true,
    userLocation:true,
    annotations:[trafficPoint]
});

//*******************************************
// Get Traffic Info from Microsoft (Rout AIP)
//*******************************************

function getDelay(){

	var BingMapsKey = "AoCljM9DrtmwDEm4shptK5rMXR6Qdy6IMmw0UbOF-1fXMmn1igvOv9-6Lr4qDfnJ";
	var waypoint0 = "waypoint.0="+Titanium.App.Properties.getDouble("userLat")+","+Titanium.App.Properties.getDouble("userLon");
	var waypoint1 = "waypoint.1="+Titanium.App.Properties.getDouble("myLat")+","+Titanium.App.Properties.getDouble("myLon");

	//Route Traffic URLs
	var url = "http://dev.virtualearth.net/REST/V1/Routes/Driving?" + waypoint0 + "&" + waypoint1 + "&key=" + BingMapsKey;
	
	var json;
	var xhr = Ti.Network.createHTTPClient({
	    onload: function() {
			// parse the retrieved data, turning it into a JavaScript object
	    	json = JSON.parse(this.responseText);
	    	
	    	//Ti.API.info(json);
	    	var ideal = json.resourceSets[0].resources[0].travelDuration;
	    	var traffic = json.resourceSets[0].resources[0].travelDurationTraffic;
	    	var delay = (traffic - ideal);// / 60; //returns in seconds
	    	//Sets saved delay so MS mapes only needs to be used every once in a while
	    	Titanium.App.Properties.setInt("delay", delay);
	    	//Ti.API.info("Delay: " + delay);
	    	return delay;
		}
	});

	xhr.open("GET",""+url);
	xhr.send();
}

//************************
// Get GPS Info
//************************

Ti.Geolocation.purpose = 'Track Location';
Ti.Geolocation.accuracy = Ti.Geolocation.ACCURACY_BEST;
Ti.Geolocation.distanceFilter = 0; // set to slow updates
Ti.Geolocation.preferredProvider = Ti.Geolocation.PROVIDER_GPS;

function getGPS(e) {
	if (Ti.Geolocation.locationServicesEnabled) {	 
		 var uLat = e.coords.latitude;
		 var uLon = e.coords.longitude;
		 Titanium.App.Properties.setDouble("userLat", uLat);
  		 Titanium.App.Properties.setDouble("userLon", uLon);
	} else {
    	 alert('Please enable location services');
	}
}

//*************************************
// create base UI tab and root window
//*************************************

// create tab group
var tabGroup = Titanium.UI.createTabGroup();

//*************************************
// Alarm Window / UI (tab1)
//*************************************

var win1 = Titanium.UI.createWindow({  
    title:'Set Your Ideal Alarm',
    layout: 'vertical',
    backgroundColor:'#fff'
});

var tab1 = Titanium.UI.createTab({  
    icon:'KS_nav_views.png',
    title:'Alarm',
    window:win1
});

var label1 = Titanium.UI.createLabel({
	color:'#999',
	text:'Set Ideal Alarm',
	font:{fontSize:20,fontFamily:'Helvetica Neue'},
	textAlign:'center',
	width:'auto'
});

var labelDelay = Titanium.UI.createLabel({
	color:'#999',
	text:'Current Delay: ' + (Titanium.App.Properties.getInt("delay", 0) / 60).toFixed(2) + ' Min',
	font:{fontSize:20,fontFamily:'Helvetica Neue'},
	textAlign:'center',
	width:'auto'
});

//Alarm Shut off
var cancelButton = Ti.UI.createButton({ 
	systemButton: Ti.UI.iPhone.SystemButton.CANCEL, 
	title: "Stop Alarm",
});

//https://developer.appcelerator.com/question/152593/24-hour-clock-in-picker
//Time Picker
var temp = new Date(new Date().getTime());
var transformPicker = Titanium.UI.create2DMatrix().scale(0.7);
var picker = Titanium.UI.createPicker({
    type:Titanium.UI.PICKER_TYPE_TIME,
    heigth: 85,
    value: Titanium.App.Properties.getObject("alarm", temp),  
    bottom:0,
    transform:transformPicker
});

//Play Alarm
function alarmStart() {
	player.setLooping(true);
	player.play();
}

//Stop Alarm
function alarmStop() {
	player.setLooping(false);
	player.stop();
}

function check_time()
{
    var myDate = new Date(new Date().getTime());
    var alarmDate = Titanium.App.Properties.getObject("alarm");
    var delay = Titanium.App.Properties.getInt("delay", 0);
    
    Ti.API.info("Current: "+ getTimeSeconds(myDate));
    Ti.API.info("Alarm: "+ getTimeSeconds(alarmDate));
    Ti.API.info("Alarm Ajusted: "+ (getTimeSeconds(alarmDate) - delay));
    Ti.API.info("Delay: " + delay);
    
    if (getTimeSeconds(myDate) + delay == getTimeSeconds(alarmDate)){
    	alarmStart();
    }
}

function getTimeSeconds(date){
	var seconds = date.getSeconds() + (date.getMinutes()*60) + ((date.getHours()%24)*3600);
	return seconds;
}

win1.add(labelDelay, picker, cancelButton);

//**********************
// Recorder Window / UI (tab2)
//**********************

var winRec = Titanium.UI.createWindow({  
    title:'Record an Alarm',
    backgroundColor:'#fff',
    layout: 'vertical'
});

var tab2 = Titanium.UI.createTab({  
    icon:'KS_nav_ui.png',
    title:'Rec.',
    window:winRec
});

var startRec = Ti.UI.createButton({ 
	systemButton: Ti.UI.iPhone.SystemButton.CANCEL, 
	title: "Start Recording",
});

var stopRec = Ti.UI.createButton({ 
	systemButton: Ti.UI.iPhone.SystemButton.CANCEL, 
	title: "Stop Recording",
});

var playback = Ti.UI.createButton({ 
	systemButton: Ti.UI.iPhone.SystemButton.CANCEL, 
	title: "Playback",
});

var stop = Ti.UI.createButton({ 
	systemButton: Ti.UI.iPhone.SystemButton.CANCEL, 
	title: "Stop",
});

winRec.add(startRec, stopRec, playback, stop);

//*************************
// create map window / UI (tab3)
//*************************

var win3 = Titanium.UI.createWindow({  
    title:'Drag Pin to Destination',
    backgroundColor:'#fff'
});

var tab3 = Titanium.UI.createTab({  
     icon:'KS_nav_ui.png',
    title:'Map',
    window: win3
});

var label3 = Titanium.UI.createLabel({
	color:'#999',
	text:'Map Goes Here',
	font:{fontSize:20,fontFamily:'Helvetica Neue'},
	textAlign:'center',
	width:'auto'
});

win3.add(label3);
win3.add(mapview);

//**************************
// Event Handelers			
//*************************

// Hande Click Events for Anotations on Map
mapview.addEventListener('click', function(evt) {
    Ti.API.info("Annotation " + evt.title + " clicked, id: " + evt.annotation.myid);
});

//**********************
// handel Anotation Drag 
// http://blog.rafaelks.com/post/25858188014/draggable-annotations-with-titanium-appcelerator
//**********************

mapview.addEventListener("pinchangedragstate", function(e) {
  	Titanium.App.Properties.setDouble("myLat", e.annotation.latitude);
  	Titanium.App.Properties.setDouble("myLon", e.annotation.longitude);
});

//**********************
// Handle GPS updates
//**********************

Titanium.Geolocation.addEventListener('location', getGPS);

//**********************
// Handle Alarm
//**********************

// Handel User Changing Alarm
picker.addEventListener('change',function(e){
  Ti.API.info("User selected date: " + e.value.toLocaleString());
  Titanium.App.Properties.setObject("alarm", e.value);
  Titanium.App.Properties.setBool("alarmState", true);
});

// Handle Alarm
var myTimer = setInterval(function(){
	//Ti.API.info("checking alarm");
	check_time();
}, 1000);

//Handle Shut Off Alarm
cancelButton.addEventListener('click',function(e) {
   alarmStop();
   Titanium.App.Properties.setBool("alarmState", false);
});

//**********************
// Handle traffic Delay
//**********************

var myDelay = setInterval(function(){
	Ti.API.info("checking delay");
	//labelDelay.text = getDelay()/60; //not working
	var myDate = new Date(new Date().getTime());
    var alarmDate = Titanium.App.Properties.getObject("alarm");
    var delay = Titanium.App.Properties.getInt("delay", 0);
    var alarmSeconds = getTimeSeconds(alarmDate);
    var mySeconds = getTimeSeconds(myDate);
    
    //Check to make sure we dont skip alarm;
    //This feature is not refined.  Plese close app after you wake up
	if (delay >= alarmSeconds - mySeconds && Titanium.App.Properties.getBool("alarmState")){
		Titanium.App.Properties.setObject("alarm", myDate);
		Titanium.App.Properties.setInt("delay", 0); //Only 0s for 5 min
	} 
}, 300000); //Checks Every 5 minutes

//******************************
// Handels Recording
//******************************

startRec.addEventListener('click', function() {
	Ti.API.info("start Recording");
    if (recording.recording){ //stop recording
    	Ti.API.info("Was Already Recording");
    	file = recording.stop();
    	Ti.Media.stopMicrophoneMonitor();
    } else {
    	// Error Check
    	if (!Ti.Media.canRecord) {
    		Ti.UI.createAlertDialog({
				title:'Error!',
				message:'No audio recording hardware is currently connected.'
			}).show();
			return;
    	}
    	Ti.API.info("Recording Started");
    	recording.start();
    	Ti.Media.startMicrophoneMonitor();
    }
});

//var newRec=Titanium.Filesystem.getFile('rec.wav');

stopRec.addEventListener('click', function() {
	Ti.API.info("Stop Recording");
	if (recording.recording){ //stop recording
		Ti.API.info("Recording Stoped / Saved");
    	file = recording.stop();
    	Ti.Media.stopMicrophoneMonitor();
    	myAlarm.write(file);
    	myAlarm = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory,'user.wav');
    	player  = Ti.Media.createSound({url: myAlarm.nativePath});
    }
});

playback.addEventListener('click', function() {
	Ti.API.info("Playback");
	alarmStart();
});

stop.addEventListener('click', function() {
	Ti.API.info("Playback Stop");
	alarmStop();
});

//*******************
// Shake Listener
//*******************

Ti.Gesture.addEventListener("shake", function(e){
	Ti.API.info("Shake Recorded");
	alarmStop();
    Titanium.App.Properties.setBool("alarmState", false);
});

//*******************
//  MY Eye 
//*******************

var tag = Ti.UI.createButton({
	systemButton:Titanium.UI.iPhone.SystemButton.TRASH,
	title : 'Send'
});

var win4 = Titanium.UI.createWindow({  
    title:'My Eye',
    backgroundColor:'#fff'
});

var tab4 = Titanium.UI.createTab({  
     icon:'KS_nav_ui.png',
    title:'My Eye',
    window: win4
});

win4.add(tag);

// POST file to server
tag.addEventListener('click', function() {

    var xhr = Titanium.Network.createHTTPClient();

    xhr.open('POST', 'http://1-dot-lwb120392v2.appspot.com/addtag');

    xhr.onerror = function(e) {
        Ti.API.info('IN ERROR ' + e.error);
    };
	
	xhr.onload = function(response) {

         if ( this.responseText != 0){
            var responseURL = this.responseText;
            alert('Server Response ' +responseURL);
         }else {
             alert("The upload did not work! Check your server settings.");
         }
    };
    
    xhr.onsendstream = function(e) {
        
    };
    
    var currentTime = new Date().getTime();
    // send the data
    xhr.send({
    	'longitude': Titanium.App.Properties.getDouble("userLon"),
  		'latitude' : Titanium.App.Properties.getDouble("userLat"),
        'postDate': currentTime,
    });
});
	




//*******************
//  add tabs
//*******************

tabGroup.addTab(tab1);  
tabGroup.addTab(tab2);  
tabGroup.addTab(tab3); 
tabGroup.addTab(tab4); 

// open tab group
tabGroup.open();