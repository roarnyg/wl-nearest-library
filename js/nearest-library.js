jQuery(document).ready(function() {
    /* MAP JS */
    //currentLat = 60.372997;//success.location.lat;
    //currentLng = 5.341668; //success.location.lng;

    var nearestCities = [];
    var userLat, userLon;
    var currentLat;
    var currentLng;

    /*Get current position and put it to map*/
    var _getLocation = function() {
        if (jQuery("#librarydatabase").children().length > 0) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(showPosition, showError);
            } else {
                x.innerHTML = "Geolocation is not supported by this browser.";
            }
            //If user click SHARE location
            function showPosition(position) {
                var latlon = position.coords.latitude + "," + position.coords.longitude;
                currentLat = position.coords.latitude;
                currentLng = position.coords.longitude;

                //Call to function draw map with current lat long
                _gM(currentLat, currentLng);
            }
            //If user click BLOCK location
            function showError(error) {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        //alert("User denied the request for Geolocation.");
                        //Force to get current long lat of user without their allow.
                        tryAPIGeolocation();
                        break;
                    case error.POSITION_UNAVAILABLE:
                        alert("Location information is unavailable.");
                        break;
                    case error.TIMEOUT:
                        alert("The request to get user location timed out.");
                        break;
                    case error.UNKNOWN_ERROR:
                        alert("An unknown error occurred.");
                        break;
                }
            }
        }
    }

    var cities = [];
    var filterCities = function() {
        jQuery('#librarydatabase').children().each(function() {
            var city = [];
            var bibnr = jQuery(this).attr('id');
            var lat = jQuery(this).html().split('|')[0].split(',')[0]; //convert to int
            var lon = jQuery(this).html().split('|')[0].split(',')[1];
            var inst = jQuery(this).html().split('|')[1];
            var vadr = jQuery(this).html().split('|')[2];
            var vpostnr = jQuery(this).html().split('|')[3];
            var vpoststed = jQuery(this).html().split('|')[4];
            var tlf = jQuery(this).html().split('|')[5];
            var tlfax = jQuery(this).html().split('|')[6];
            var epost_adr = jQuery(this).html().split('|')[7];
            var home_url = jQuery(this).html().split('|')[9];

            city.push(parseFloat(lat));
            city.push(parseFloat(lon));
            city.push(inst);
            city.push(vadr);
            city.push(bibnr);
            city.push(vadr);
            city.push(vpostnr);
            city.push(vpoststed);
            city.push(tlf);
            city.push(tlfax);
            city.push(epost_adr);
            city.push(home_url);

            cities.push(city);
        });
    }
    // Convert Degress to Radians
    function Deg2Rad(deg) {
        return deg * Math.PI / 180;
    }

    function PythagorasEquirectangular(lat1, lon1, lat2, lon2) {
        lat1 = Deg2Rad(lat1);
        lat2 = Deg2Rad(lat2);
        lon1 = Deg2Rad(lon1);
        lon2 = Deg2Rad(lon2);
        var R = 6371; // radius of earth by km
        //var R = 100;
        var x = (lon2 - lon1) * Math.cos((lat1 + lat2) / 2);
        var y = (lat2 - lat1);
        var d = Math.sqrt(x * x + y * y) * R;
        return d;
    }

    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        var R = 6371; // Radius of the earth in km
        var dLat = Deg2Rad(lat2 - lat1); // deg2rad below
        var dLon = Deg2Rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(Deg2Rad(lat1)) * Math.cos(Deg2Rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
    }

    function NearestCity(latitude, longitude, numberOfCity) {
        if (latitude == undefined || longitude == undefined) {
            latitude = currentLat;
            longitude = currentLng;
        }

        //var mindif = 99999;
        var mindif = 50; // The distance between the current location to target location
        var closest;
        var closestCities = [];
        var tempCities = cities;
        numberOfCity = 15;
        var i = 0;

        while (tempCities.length > 0 && tempCities.length > i) {
            //var dif = PythagorasEquirectangular(latitude, longitude, tempCities[i][0], tempCities[i][1]);
            // var dif = getDistanceFromLatLonInKm(60.372997, 5.341668, tempCities[i][0], tempCities[i][1]);
            //  var dif = getDistanceFromLatLonInKm(latitude, longitude, tempCities[i][0], tempCities[i][1]);
            var dif = getDistanceFromLatLonInKm(parseFloat(currentLat), parseFloat(currentLng), tempCities[i][0], tempCities[i][1]);
            i++;
            if (dif <= mindif) {
                i = i - 1;
                tempCities[i].push(dif);
                nearestCities.push(tempCities[i]);
                tempCities.splice(i, 1);
                i = 0;
            }
            if (nearestCities.length >= numberOfCity)
                break;
        } //End while

        nearestCities.sort(function (a,b) { return a[12] - b[12]; });

        // echo the nearest cities
        //nearestCities = closestCities
        for (index = 0; index < nearestCities.length; ++index) {
            jQuery('.library_record').append('<div class="first_title"><strong>' + nearestCities[index][2] + '</strong></div><div>' + nearestCities[index][3] + '</div><div>' + nearestCities[index][6] + ' ' + nearestCities[index][7] + '</div><div>'+  WLNearestLibrarySettings.phone + ': ' + nearestCities[index][8] + '</div><div style="display:none">tlfax: ' + nearestCities[index][9] + '</div><div class="epost">' + WLNearestLibrarySettings.email + ': <a target="_top" href="mailto:' + nearestCities[index][10] + '">' + nearestCities[index][10] + '</a></div><div>' + WLNearestLibrarySettings.homepage + ': <a target="_blank" href="' + nearestCities[index][11] + '">' + nearestCities[index][11] + '</a></div><br/>');
        }
    }

    /* Function to process and show map*/
    var geocoder;
    var map;
    var _gM = function(currentLat, currentLng) {

        function initialize(currentLat, currentLng) {
            geocoder = new google.maps.Geocoder();
            var address = "Oslo";
            geocoder.geocode({
                'address': address
            }, function(results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    var latitude = results[0].geometry.location.lat();
                    var longitude = results[0].geometry.location.lng();

                    NearestCity(currentLat, currentLng);

                    //var latlng = new google.maps.LatLng(latitude, longitude);
                    var latlng = new google.maps.LatLng(currentLat, currentLng);
                    var mapOptions = {
                        zoom: 9,
                        center: latlng,
                        mapTypeId: google.maps.MapTypeId.ROADMAP
                    }

                    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
                    //var latlng  = new google.maps.LatLng(60.372997,5.341668);
                    var latlng = new google.maps.LatLng(currentLat, currentLng);
                    map.setCenter(latlng);

                    for (var i = 0; i < nearestCities.length; i++) {
                        var latLng = new google.maps.LatLng(parseFloat(nearestCities[i][0]), parseFloat(nearestCities[i][1]));
                        var marker = new google.maps.Marker({
                            position: latLng,
                            map: map,
                            title: nearestCities[i][2]

                        });
                    }
                }
            });
        }
        google.maps.event.addDomListener(window, 'load', initialize(currentLat, currentLng));
    } /*END function to show map*/

    /*Force to get current lat long if user not allow*/
    var tryAPIGeolocation = function() {
        jQuery.post("https://www.googleapis.com/geolocation/v1/geolocate?key=" + WLNearestLibrarySettings.geolockey, function(success) {
            currentLat = success.location.lat;
            currentLng = success.location.lng;
            _gM(currentLat, currentLng);
        }).fail(function(err) {
            console.log("Failure when using Googles GeoLocation API: " + err.responseJSON.error.code + " " + err.responseJSON.error.message);
        });
    };

    /* Actual actions */
    if (document.getElementById('map-canvas') || document.getElementById('librarydatabase')) {
      _getLocation();
      filterCities();
    }

});
