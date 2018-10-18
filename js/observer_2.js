

var file;
var body;
var bodyType;
var flight_state;
var state = 0;//0が観測者モード、1がpilot modeもで自分の位置情報を数秒に一回発信
var heliPrediction = {};




//Firebase Legacy
var dataStore;
dataStore = new Firebase('https://amakusa.firebaseio.com/');
var airplanes = dataStore.child('airplanes');

var mymarker;
//icons
var marker = [];
var infoWindow = [];
var markerData = [];

var locationJson;
var locationCoordinates = [];
var _directionsService
var _directionsRenderer
var _distanceMatrixService


// Maps
var map;
var tokyo;
var pos;
function initMap() {//keyを取得してgoogle maps apiのsourceを取得した後に発火する
	map = new google.maps.Map(document.getElementById('map'), {
		center: { lat: 33.7102883, lng: 130.4243688 },
		zoom: 12
	});
	// tokyo = new google.maps.LatLng(35.689614,139.691585);
	// pos = new google.maps.LatLng(34.686272,135.519649);
	_directionsService = new google.maps.DirectionsService;
	_directionsRenderer = new google.maps.DirectionsRenderer;
	_distanceMatrixService = new google.maps.DistanceMatrixService();

}


//Get Key
var gkey;
dataStore.child('key').on('child_added', function (dataSnapShot) {
	gkey = dataSnapShot.val();
	console.log("gkey:" + gkey);
	//	var src="http://maps.google.com/maps/api/js?sensor=false&libraries=geometry"
	var src = "https://maps.googleapis.com/maps/api/js?key=" + gkey + "&libraries=geometry&callback=initMap";
	var scriptElement = document.createElement('script');
	scriptElement.src = src;
	document.getElementsByTagName('head')[0].appendChild(scriptElement);
});



function getValue(idname) {
	// value値を取得する
	var result = document.getElementById(idname).value;
	locationJson = JSON.parse(result);
	// Alertで表示する
	alert("取得成功");
}


function addLines() {

	for (let i in locationJson.locations) {
		console.log(locationJson.locations[i].timestampMs + "to" + i);
		locationCoordinates.push({ lat: locationJson.locations[i].latitudeE7 * 0.0000001, lng: locationJson.locations[i].longitudeE7 * 0.0000001 });
		// console.log(locationCoordinates)
	}

	var flightPath = new google.maps.Polyline({
		path: locationCoordinates,
		geodesic: true,
		strokeColor: '#ff0000',
		strokeOpacity: 0.8,
		strokeWeight: 0.3
	});
	flightPath.setMap(map);

}

//距離の計算//
function getDistance(lat1, lng1, lat2, lng2) {

	function radians(deg) {
		return deg * Math.PI / 180;
	}

	return 6378.14 * Math.acos(Math.cos(radians(lat1)) *
		Math.cos(radians(lat2)) *
		Math.cos(radians(lng2) - radians(lng1)) +
		Math.sin(radians(lat1)) *
		Math.sin(radians(lat2)));
}

// DistanceMatrixを実行
function calcDistanceMatrix() {
	console.log("start")
	// if (_markers.length === 0) {
	// 	alert('実行できません。');
	// 	return;
	// }

	// Places API で取得したプレイスの緯度経度を配列に格納
	var startposition = [];
	var destination = [];
	var i;
	for (i = locationCoordinates.length - 1; i > 0; i--) {
		console.log(locationCoordinates)
		console.log(locationCoordinates.length)
		console.log(locationCoordinates[i])


		if (getDistance(locationCoordinates[i - 1].lat, locationCoordinates[i - 1].lng, locationCoordinates[i].lat, locationCoordinates[i].lng) > 10) {
			startposition.push(locationCoordinates[i - 1]);
			destination.push(locationCoordinates[i]);
			console.log("push")
		} else {
			console.log("No")
		}
	}


	console.log(startposition)
	console.log(destination)
	// DistanceMatrix 実行



	_distanceMatrixService.getDistanceMatrix({
		origins: startposition, // 出発地点
		destinations: destination, // 到着地点（Placesで取得した場所）
		travelMode: getTravelMode($('#travelMode').val()),
		avoidHighways: false,
		avoidTolls: false,
		avoidFerries: false,
		drivingOptions: {
			departureTime: new Date($("#departureTime").val()),
			trafficModel: getTrafficModel($("#trafficModel").val())
		}
	}, function (response, status) {
		console.log(response);
		if (status == google.maps.DistanceMatrixStatus.OK) {
			// 結果を格納するための配列
			var sortResults = new Array();

			// 出発地点と到着地点の配列を取得
			var origins = response.originAddresses;
			var destinations = response.destinationAddresses;

			// 出発地点でループ
			for (var i = 0; i < origins.length; i++) {
				// 出発地点（i番目）から到着地点への計算結果
				var results = response.rows[i].elements;

				// 到着地点でループ
				for (var j = 0; j < results.length; j++) {
					var from = origins[i]; // 出発地点の住所
					var to = destinations[j]; // 到着地点の住所
					var duration = results[j].duration.value; // 時間
					var distance = results[j].distance.value; // 距離
					//console.log("{},{},{},{}", from, to, duration, distance);
					// 結果を配列に格納
					sortResults.push([from, to, duration, distance, results[j], j]);
				}
			}

			// 到着時間でソート
			sortResults.sort(function (a, b) {
				return a[2] - b[2];
			});
			console.log(sortResults);

			// 表示用のHTMLを作成
			var html = new Array();
			for (var i = 0; i < sortResults.length; i++) {
				var placeNo = sortResults[i][5];
				html.push('<tr data-index="' + placeNo + '">');
				html.push('<td>' + sortResults[i][3] + '</td>');
				html.push('<td>' + sortResults[i][4].duration.text + '</td>');
				html.push('<td>' + sortResults[i][4].distance.text + '</td>');
				html.push('</tr>');

			}
			$('#result-body').html(html.join(''));

			// クリック時にルート検索を実行するようイベントを定義
			$('#result-body tr').on('click', function (e) {
				var i = this.dataset.index;
				var place = _kytplaces[i];
				//console.log(place);
				calcRoute(kytplaces);
				google.maps.event.trigger(_markers[i], 'click');
			});

		} else {
			alert('DistanceMatrix 失敗(' + status + ')');
		}
	});
};


// ルート検索実行
function calcRoute(end) {
	clearRoute();
	var travelMode = $("#travelMode").val();
	var trafficModel = $("#trafficModel").val();
	var departureTime = $("#departureTime").val();

	_directionsRenderer.setMap(_map);
	_directionsService.route({
		origin: _orign,
		destination: end,
		travelMode: getTravelMode(travelMode),
		drivingOptions: {
			departureTime: new Date(departureTime),
			trafficModel: getTrafficModel(trafficModel),
		}
	}, function (response, status) {
		console.log(response);
		if (status === google.maps.DirectionsStatus.OK) {
			_directionsRenderer.setDirections(response);
		} else {
			alert('Directions 失敗(' + status + ')');
		}
	});
};

// ルートをクリア
function clearRoute() {
	_directionsRenderer.setMap(null);
};

// ルートと検索結果をクリア
function clearAll() {
	clearRoute();
	$('#result-body').html('');
};

// ルート検索モード取得
function getTravelMode(mode) {
	var travelMode;
	if (mode == 1) {
		travelMode = google.maps.TravelMode.DRIVING;
	} else if (mode == 2) {
		travelMode = google.maps.TravelMode.WALKING;
	} else if (mode == 3) {
		travelMode = google.maps.TravelMode.TRANSIT;
	} else if (mode == 4) {
		travelMode = google.maps.TravelMode.BICYCLING;
	}
	return travelMode;
};

// TrafficModel 取得
function getTrafficModel(traffic) {
	var trafficModel;
	if (traffic == 1) {
		trafficModel = google.maps.TrafficModel.BEST_GUESS;
	} else if (traffic == 2) {
		trafficModel = google.maps.TrafficModel.OPTIMISTIC;
	} else if (traffic == 3) {
		trafficModel = google.maps.TrafficModel.PESSIMISTIC;
	}
	return trafficModel;
};




// 起動時の処理
$(window).on('load', function () {
	// initMap();
	// resize();
	// $('#search-button').on('click', function (e) {
	// 	geocode($('#search-text').val());
	// });
	// $('#search-text').on('keypress', function (e) {
	// 	if (e.which === 13) {
	// 		geocode($('#search-text').val());
	// 		return false;
	// 	}
	// });
	$('#route-button').on('click', function (e) {
		clearAll();
		calcDistanceMatrix();
		// update();
		// setTimeout(() => {
		//     calcDistanceMatrix();
		// }, 2200);
	});
	$('#clear-button').on('click', function (e) {
		clearAll();
	});
	$('#kytpush').on('click', function (e) {
		kytpush();
	});
	$('#departureTime').datetimepicker();
	$('#kyttimestart').datetimepicker();
	$('#kyttimeend').datetimepicker({
		useCurrent: false //Important! See issue #1075
	});
	$("#kyttimestart").on("dp.change", function (e) {
		$('#kyttimeend').data("DateTimePicker").minDate(e.date);
	});
	$("#kyttimeend").on("dp.change", function (e) {
		$('#kyttimestart').data("DateTimePicker").maxDate(e.date);
	});

});

