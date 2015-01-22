var rotation, context, image;

var animateIcon = function(){
	rotation++;

	context.save();
	context.clearRect(0, 0, 32, 32);
	context.translate(16, 16);
	context.rotate(rotation * Math.PI / 32);
	context.translate(-16, -16);
	context.drawImage(image, 0, 0);
	context.restore();

	chrome.browserAction.setIcon({
		imageData: context.getImageData(0, 0, 19, 19)
	});

	if(rotation <= 63){
		setTimeout(animateIcon, 10);
	} else {
		rotation = 0;
	}
}

var updateBadge = function(text){
	if(text !== undefined){
		chrome.browserAction.setBadgeBackgroundColor({color: '#002EA6'});
		chrome.browserAction.setBadgeText({text: text.toString()});

		if(+localStorage.getItem('stripe-counter') !== +text)
			animateIcon();

		localStorage.setItem('stripe-counter', text);
	} else {
		chrome.browserAction.setBadgeBackgroundColor({color: '#D00018'});
		chrome.browserAction.setBadgeText({text: '?'});
	}
}

var onReadyState = function(){
	if(this.readyState === 4){
		var count;
		if(this.status === 200){
			var response = JSON.parse(this.response);
			count = response.total_count;
		}
		updateBadge(count);
	}
}

var requestCount = function(){
	chrome.cookies.get({ url: 'https://stripe.com', name: 'stripe.csrf' },
	  function (cookie) {
	  	var cookieVal = cookie ? cookie.value : '';
	    var xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://dashboard.stripe.com/ajax/api/search/customers?limit=0&subscription=true&include%5B%5D=total_count');
		xhr.onreadystatechange = onReadyState;
		xhr.setRequestHeader('x-stripe-csrf-token', decodeURIComponent(cookieVal));
		xhr.setRequestHeader('x-stripe-livemode', true);
		xhr.send();
	});
}

var onInitialize = function(){
	localStorage.setItem('stripe-counter', -1);

	rotation = 0;

	var canvas = document.createElement('canvas');
	canvas.height = 19;
	canvas.width = 19;

	context = canvas.getContext('2d');
	context.scale(0.6, 0.6)

	image = new Image();
	image.src = '/icons/icon32.png';

	requestCount();

	chrome.alarms.create('stripe-counter', {periodInMinutes: 1});
}

chrome.runtime.onStartup.addListener(onInitialize);
chrome.runtime.onInstalled.addListener(onInitialize);

chrome.browserAction.onClicked.addListener(function(){
	chrome.tabs.query({
		url: 'https://dashboard.stripe.com/customers'
	}, function(tabs){
		var tab = tabs[0];
		if(tab){
			chrome.tabs.update(tab.id, {active: true});
			chrome.tabs.reload(tab.id);
		} else {
			chrome.tabs.create({url: 'https://dashboard.stripe.com/customers?subscription=true'});
		}
	});
});

chrome.alarms.onAlarm.addListener(function(alarm){
	if(alarm.name === 'stripe-counter'){
		requestCount();
	}
})
