import 'ol/ol.css';
import 'leaflet';                                     //Mapping library 
import cameraPng from './camera.png'
import * as statesData from './us-states.json';       //GeoJSON outlines out states convered from JSON. Source: Cloropleth Map Tutorial https://leafletjs.com/examples/choropleth/us-states.js
import * as meep from './config.json'                 //Config variable
import 'mapbox-gl';                                   //For rendering vector tiles
import 'mapbox-gl-leaflet';                           //Allows cross compatibility with Leaflet.js
import 'leaflet.markercluster';                       //Clickable "marker clusters" which explode into markers
import 'leaflet-sidebar-v2';
const request = require('request');
const csv = require('csvtojson');                     //CSV to JSON converter
var snoowrap = require('snoowrap');                   //Reddit API handler.
var Flickr = require('flickr-sdk');                   //Flickr API handler

var markerCluster = L.markerClusterGroup({singleMarkerMode: true, animateAddingMarkers: true});   //Marker cluster layer where markers will be added first.
var circles = L.layerGroup();                         //Layer for circle that show search radius for draggable camera tool.
var flickr = new Flickr(meep.config.FLAK);

function createMap(){
  var map = L.map('map', {zoomControl: false, maxZoom: 10}).setView([38.416381, -95.148209], 5);    //Map object (zoom object = false to add it in the next line
  L.control.zoom({position: 'bottomright'}).addTo(map)                                              //  in a different corner.
  var gl = L.mapboxGL({                                                                             //The map tiles themselves here.
    attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a><div>Icons made by <a href="https://www.flaticon.com/authors/freepik" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>',
    accessToken: 'not-needed',
    maxZoom: 29,
    style: 'https://api.maptiler.com/maps/6b84c589-0e12-49b7-b2ce-817d4e3eaf7e/style.json?key=pSpHSntkFsKjyR1ygjJb'
  }).addTo(map);
  return map;
}

function getFlickrPhotosForUS(){
  flickr.photos.search({
    text: "coronavirus",                                //Search for photos containing "coronavirus",
    has_geo: "1",                                       //  that have been geotagged,
    safe_search: "2",                                   //  safesearch = moderate
    min_taken_date: "2020-03-05",                       
    accuracy: "11",                                     //City-level accuracy
    content_type: "1",                                  //Photos only
    geo_context: "2",                                   //Outdoors
    bbox: "-125.3321, 23.8991, -65.7421, 49.4325",      //Bounding box for continental U.S. (sorry AK, HI)
    per_page: "250",                                    
    page: `${Math.floor(Math.random() * 4 + 1)}`        //Random page between 1 and 4.
  }).then(function (res) {
    let randomNum = Math.floor((Math.random() * 250));  //Random number between 0 and 249
    for(var i=randomNum; i<randomNum+250; i += 5){      //Grab each 5th photo = 50 total
      var iRange = (i % 250);                           //Will ensure that i is always between 0 and 249
      let imgObj = res.body.photos.photo[iRange];
      flickr.photos.getInfo({photo_id: `${imgObj.id}`}).then(function(res){
        makeFlickrMarker(imgObj, res.body.photo)})
    }
    map.addLayer(markerCluster);                        //Add markerCluster array to map
  })
}


function makeFlickrMarker(img, imgInfo){
  img.info = imgInfo;
  var marker = L.marker([imgInfo.location.latitude, imgInfo.location.longitude]).on('click', function(){photoPane.update(img)})
  markerCluster.addLayer(marker);
}

function getPhotosAtLatLng(e){                        //Function for grabbing photos by user-defined location by dragging camera icon.
  if(e.target){
    var latLng = e.target.getLatLng();                //Finds location of camera icon after it's been dragged.
  }
  else{var latLng = e.getLatLng();}
  var center = map.project(latLng);
  map.setView(map.unproject(center), 9, {animate: true});
  var circle = L.circle(map.unproject(center), {      //Creates transparent white circle for search radius.
    color: 'black',
    fillColor: 'white',
    fillOpacity: 0.2,
    radius: 32000
  });
  circles.addLayer(circle);
  map.addLayer(circles);
  flickr.photos.search({                              //Search Flickr for photos @ user-defined coords.
    text: "coronavirus",
    safe_search: "2",
    min_taken_date: "2020-03-05",
    accuracy: "11",
    lat: `${(Math.round(latLng.lat*1000)/1000)}`,     //Rounding coordinates to thousandths or else Flickr will reject it.
    lon: `${(Math.round(latLng.lng*1000)/1000)}`,
    radius: "32"
  }).then(function(res){
    for(var i=0; i<30; i++){
      let imgObj = res.body.photos.photo[i];          //Pass photo object from array, get author/link information, pass it to marker generating function
      flickr.photos.getInfo({photo_id: `${imgObj.id}`}).then(function(res){makeFlickrMarker(imgObj, res.body.photo)})
    }
  })
}



function createCameraTool(){
  var cameraIcon = L.icon({                                     //Camera icon that can be dragged around map area.
    iconUrl: cameraPng,
    iconSize: [30, 30],
    popupAnchor: [0, -15],
    iconAnchor: [15, 15]
  })

  var cameraMarker = L.marker([29.91342, -72.29003],            //Starts in the bottom right at initialization. 
      {draggable: true, icon: cameraIcon}).on({
        dragend: getPhotosAtLatLng,
        dragstart: deleteCircle
  }).addTo(map)

  function deleteCircle(){
    if(map.hasLayer(circles)){
      map.removeLayer(circles)
      circles.clearLayers();
    }
  }

  cameraMarker.bindPopup("Click and drag me to find pictures for a specific area.")
  setTimeout(function(){cameraMarker.openPopup()}, 5000)        //Wait 5 seconds to alert the user of it's function.
}

function findColorFromJSON(cases){                           //Determines color (from dark to light) for descending number of cases.
  return cases > 10000 ? '#016450' :                         //   Source: https://leafletjs.com/examples/choropleth/
         cases > 4000 ? '#02818a' :
         cases > 1000 ? '#3690c0' :
         cases > 500 ? '#67a9cf' :
         cases > 300 ? '#a6bddb'  :
         cases > 100 ? '#d0d1e6' :
         cases > 50 ? '#ece2f0' :
         cases < 50 ? '#fff7fb' :
         '#FFEDA0';
}

function createRedditPane(){
  var redditPane = document.createElement('div');
  redditPane.id = 'redditPane';
  redditPane.classList.add('redditPane');
  redditPane.classList.add('leaflet-sidebar-content')
  redditPane.update = function(props, name){                                                //Updates Reddit sidebar tab when content is triggered.
    this.innerHTML = (props ? '<div><h3>Recent Reddit posts from r/Coronavirus about ' + name + '</h3>' : "<div><h3><i>Click a state to view local stories...</i></h3></div>");
    if(props){
      sidebar.open('redditPosts')
      for(var i=0; i<10; i++){
        if(props[i]){
          var createdDate = new Date(props[i].created * 1000);                          //Changes Date from seconds to milliseconds
          createdDate = JSON.stringify(createdDate);                                    //Renders the date as string.
          this.innerHTML += '<a target="_blank" href="http://www.reddit.com' + props[i].permalink + '">' + props[i].title + '</a><br/>' + '<i>+' + props[i].ups + ' upvotes</br>' + createdDate.substring(1, 11) + '</i></br></br></div>';
        }
      }
    }
    if(redditContent){
      document.getElementById('redditPosts').lastChild.innerHTML = this.innerHTML       //If the panel exists, update it.
    }
  }
  
  redditPane.update();                                                                      //Initialize to default.
  return redditPane;
}

function createPhotoPane(){
  var photoPane = document.createElement('div');
  photoPane.id = 'photoPane';
  photoPane.classList.add('photoPane');
  photoPane.classList.add('leaflet-sidebar-content');
  
  photoPane.update = function(photo){                                                     //Changes content of sidebar photoPane tab.
    if(photo){
      photoPane.isPhoto = true;
      sidebar.open('photoPosts');
      this.innerHTML = '<h3>' + photo.title + '</h3>' + `<a href="${photo.info.urls.url[0]._content}"><img src="https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}.jpg"></img></a></br>` 
              + '<p><i>' + photo.info.owner.username + '<br/>' + photo.info.dates.taken + '<br/>' + photo.info.description._content + '<br/></p>'
              + '<p id="flickrNote">Photos provided by Flickr. This product uses the Flickr API but is not endorsed or certified by SmugMug, Inc.</p>'
      document.getElementById('photoPosts').lastChild.innerHTML = this.innerHTML;
    }
    else{this.innerHTML = '<div><h3>Click a marker to see pictures...</h3></div>'}      //Default for when no picture has been clicked.
  }
  
  photoPane.update();                                                                   //Initialize to default text.
  return photoPane;
}

function createNumOfCasesBox(){
  var numOfCasesBox = L.control();                                                      //Infoboxes that will lay atop the map

  numOfCasesBox.onAdd = function(map){
    this._div = L.DomUtil.create('div', 'numOfCasesBox');
    this.update();
    return this._div;
  }

  numOfCasesBox.update = function(props){
    if(props){
      this._div.style = `border: 8px solid ${findColorFromJSON(props.cases)}; opacity: 0.87;`
    }
    else{this._div.style = `background-color: rgba(255, 255, 255, 0.87);`}
    this._div.innerHTML = "<h3>Known Cases by State</h3>" +
      (props ? '<h5>last updated ' + props.date + '</h5>' + '<i>' + props.name + '</i><br/>' + props.cases : "Mouseover a state");
  }
  numOfCasesBox.addTo(map);
  return numOfCasesBox;
}


function createUSStatesLayer(){
  var myStatesData = statesData;                       //Copy statesData so I can alter it.
  const csvpath = 'https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-states.csv';     //Path to NYT CSV of COVID-19 cases by state.
  var casesByState = {};

  csv().fromStream(request.get(csvpath)).subscribe((json)=>{          //CSV file containing New York Times' COVID-19 case numbers.
    var thisDate = new Date();                                      //  "subscribe" function reads CSV file in one line at a time,
    new Promise((resolve,reject)=>{                                 //   so 'json' variable is just a single element.
      if(Date.parse(json.date) > (thisDate - 345600000)){           //<-- (4 days in seconds.)
        addCasesToStateData(json, function(){resolve()});
      }
    })
  }).then(addDataLayer);                                 

  function addCasesToStateData(json, func){
    if(myStatesData.features.find(x => x.id === json.fips)){                                               //Locates element with matching FIPS state code in *another* JSON file which has geographical data.
      casesByState[`${json.fips}`] = json;                            
      myStatesData.features.find(x => x.id === json.fips).properties.cases = json.cases;                   //Add the necessary data from the NYT CSV file to the geograpy file.
      myStatesData.features.find(x => x.id === json.fips).properties.date = json.date;
    }
    return func();      //Resolves promise.
  }

  var originalTheme;

  function addDataLayer(){
    originalTheme = L.geoJSON(myStatesData, {style: style, onEachFeature: onEachFeature}).addTo(map);     //Adds my data on top of the map, save this style in originalTheme.                                                          //Settings for when a user is found via geolocation.
  }


  function style(feature){                                                                                //Styling for state outlines.
    return{
      fillColor: findColorFromJSON(feature.properties.cases),
      weight: 2,
      opacity: 1,
      color: 'black',
      dashArray: '3',
      fillOpacity: 0.25,
    }
  }

  function mouseoverState(e){                                               //Changes the styling of a U.S. state on mouseover.
    var layer = e.target;
    numOfCasesBox.update(layer.feature.properties)
    layer.setStyle({
      weight: 3,
      dashArray: '',
    })
  }
  
  function revertState(e){                                                  //Reverts back to original style for U.S. state.
    originalTheme.resetStyle(e.target);
    numOfCasesBox.update();
  }
  
  function onEachFeature(feature, layer){                                   //Attaches event functions to U.S. states.
    layer.on({
      mouseover: mouseoverState,
      mouseout: revertState,
      click: searchNews
    })
  }
  function searchNews(e){
    var layer = e.target;
    var name = layer.feature.properties.name;
    snoowrap.fromApplicationOnlyAuth({
      userAgent: 'Windows:COVID-2.by.location:v1 (by /u/Bleepenvoy)',
      clientId: meep.config.RCLID,
      clientSecret: meep.config.RCLSC,
      grantType: snoowrap.grantType.CLIENT_CREDENTIALS
    }).then(r => {
      return r.search({
        query: name,
        subreddit: 'coronavirus',
        time: 'week',
        sort: 'new',
        limit: 10
      }).then(function(response){
        redditPane.update(response, name)})
    })
  }
}

//Initializes sidebar and tabs.==========================
function intializeSidebar(){
  var sidebar = L.control.sidebar({                                       
    autopan: true,
    closeButton: true,
    position: "left"
  })
  var oldPane = document.querySelector('.leaflet-sidebar');               //Saving old style properties as I will alter them in the next function.
  sidebar.on('content', function(e){                                    //Changes width of sidebar for panes depending on which tab is active.
    let pane = document.querySelector('.leaflet-sidebar');
    if(e.id === 'photoPosts'){
      if(!photoPane.isPhoto){
        return;
      }
      pane.style.width = "35%";                                         //Wider for photos, thinner for Reddit posts.                   
      pane.style.maxWidth = "35%";
    }
    else if(e.id === 'redditPosts'){
      pane.style.width = '25%';
      pane.style.maxWidth = '25%';
    }
    else{
      pane = oldPane;                                                   //Reset to default otherwise.
    }
  })
  sidebar.on('closing', function(){
    let pane = document.querySelector('.leaflet-sidebar');
    pane.style.cssText = '';                                           //Gets rid of styling so it can close properly.
  })
  sidebar.addTo(map);   
  return sidebar
}

function initializeRedditContent(){
  var redditContent = sidebar.addPanel({                                 
    id: 'redditPosts',
    title: 'Reddit Posts',
    tab: '<i class="fab fa-reddit-alien"></i>',
    pane: redditPane.innerHTML
  });
  return redditContent;
}

function initializePhotoContent(){
  var photoContent = sidebar.addPanel({
    id: 'photoPosts',
    title: 'Photos',
    tab: '<i class="far fa-images"></i>',
    pane: photoPane.innerHTML
  })
  return photoContent;
}

function initializeFindUserButton(){
  var findUserButton = sidebar.addPanel({
    id: 'findUser',
    title: 'Find Me',
    tab: '<i class="fas fa-location-arrow"></i>',
    button: function(e){findUser(e)}
  })
  function findUser(){
    map.locate({setView:true, maxZoom: 8}) 
    map.on('locationfound', function(e){
     var locationMarker =  L.marker(e.latlng).addTo(map)
      .bindPopup("You are here.").openPopup();
      L.circle(e.latlng, radius).addTo(map);
      var radius = e.accuracy;
      getPhotosAtLatLng(locationMarker);
    });
  }
  return findUserButton
}
 //=====================================================                                                                     


var map = createMap();
getFlickrPhotosForUS();
createCameraTool();
var redditPane = createRedditPane();
var photoPane = createPhotoPane();
var numOfCasesBox = createNumOfCasesBox();
createUSStatesLayer();
var sidebar = intializeSidebar();
var redditContent = initializeRedditContent();
var photoContent = initializePhotoContent();
var findUserButton = initializeFindUserButton();


