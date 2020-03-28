import 'ol/ol.css';
import 'leaflet';
import * as statesData from './us-states.json';
import 'leaflet-providers';
import 'mapbox-gl';
import 'mapbox-gl-leaflet';
import 'leaflet-sidebar-v2';
const request = require('request');
const csv = require('csvtojson');
var snoowrap = require('snoowrap');
var originalTheme;

var myStatesData = statesData

const csvpath = 'https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-states.csv';

var casesByState = {};
var map = L.map('map').setView([38.416381, -95.148209], 5);

csv().fromStream(request.get(csvpath)).subscribe((json)=>{          //CSV file containing New York Times' COVID-19 case numbers.
    var thisDate = new Date();                                      //  "subscribe" function reads CSV file in one line at a time,
    new Promise((resolve,reject)=>{                                 //   so 'json' variable is just a single element.
      if(Date.parse(json.date) > (thisDate - 345600000)){           //(4 days in seconds.)
        addToArray(json, function(){resolve()});
      }
    })
  }).then(logIt);                                 

function addToArray(json, func){
  if(myStatesData.features.find(x => x.id === json.fips)){                                               //Locates element with matching FIPS state code in *another* JSON file which has geographical data.
    casesByState[`${json.fips}`] = json;                            
    myStatesData.features.find(x => x.id === json.fips).properties.cases = json.cases;                   //Add the necessary data from the NYT CSV file to the geograpy file.
    myStatesData.features.find(x => x.id === json.fips).properties.date = json.date;
  }
  return func();      //Resolves promise.
}

function logIt(){
  originalTheme = L.geoJSON(myStatesData, {style: style, onEachFeature: onEachFeature}).addTo(map);     //Adds my data on top of the map.                                                               //Settings for when a user is found via geolocation.
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

function findColorFromJSON(cases){                                                                     //Determines color (from dark to light) for descending number of cases.
  return cases > 10000 ? '#016450' :
         cases > 4000 ? '#02818a' :
         cases > 1000 ? '#3690c0' :
         cases > 500 ? '#67a9cf' :
         cases > 300 ? '#a6bddb'  :
         cases > 100 ? '#d0d1e6' :
         cases > 50 ? '#ece2f0' :
         cases < 50 ? '#fff7fb' :
         '#FFEDA0';
}

                               //This is the basemap (from http://maps.stamen.com/toner/#12/37.7706/-122.3782)

var info = L.control();                                                                               //Infoboxes that will lay atop the map
/* var news = L.control({position: 'bottomright'}); */
var reddit = document.createElement('div');
reddit.id = 'reddit';
reddit.classList.add('reddit');
reddit.classList.add('leaflet-sidebar-content')

reddit.update = function(props, name){
  this.innerHTML = (props ? '<div><h3>Recent Reddit posts from r/Coronavirus about ' + name + '</h3>' : "<div><h3><i>Click a state to view local stories...</i></h3></div>");
  if(props){
    for(var i=0; i<10; i++){
      if(props[i]){
        var createdDate = new Date(props[i].created * 1000);
        createdDate = JSON.stringify(createdDate);
        this.innerHTML += props[i].title + '<br/>' + '<i>+' + props[i].ups + ' upvotes</br>' + createdDate.substring(1, 11) + '</i></br></br></div>';
      }
    }
  }
  if(panelContent){
    document.getElementById('redditPosts').lastChild.innerHTML = this.innerHTML
    console.log(panelContent)
  }
}

reddit.update();

/* news.onAdd = function(map){
  this._div = L.DomUtil.create('div', 'news');
  this.update();
  return this._div;
}

news.update = function(props, name){
  this._div.innerHTML = (props ? '<h3>Stories from ' + name + '</h3> ' : "<h3><i>Click a state to view stories</i></h3>");
  if(props){
    for(var i=0; i<3; i++){
      if(props.response.docs[i]){
        this._div.innerHTML += props.response.docs[i].headline.main + '<br/><i id="bylineDate">' + props.response.docs[i].byline.original + '<br/>' + props.response.docs[i].pub_date.substring(0, 10) + '</i><br/><br/>';
      }
    }
    this._div.innerHTML += '<a href="https://developer.nytimes.com"><img src="https://developer.nytimes.com/files/poweredby_nytimes_65a.png?v=1568441069605"/></a><br/>';
    this._div.innerHTML += "<h8 id='copyright'>" + props.copyright + "</h8>";
  }
} */

info.onAdd = function(map){
  this._div = L.DomUtil.create('div', 'info');
  this.update();
  return this._div;
}

info.update = function(props){
  if(props){
    this._div.style = `border: 8px solid ${findColorFromJSON(props.cases)}; opacity: 0.87;`
  }
  else{this._div.style = `background-color: rgba(255, 255, 255, 0.87);`}
  this._div.innerHTML = "<h3>Known Cases by State</h3>" +
    (props ? '<h5>last updated ' + props.date + '</h5>' + '<i>' + props.name + '</i><br/>' + props.cases : "Mouseover a state");
}

function highlightState(e){
  var layer = e.target;
  info.update(layer.feature.properties)
  layer.setStyle({
    weight: 3,
    dashArray: '',
    fillOpacity: 0.35
  })
}

function revertState(e){
  originalTheme.resetStyle(e.target);
  info.update();
}

function onEachFeature(feature, layer){
  layer.on({
    mouseover: highlightState,
    mouseout: revertState,
    click: searchNews
  })
}

info.addTo(map);
/* news.addTo(map); */

var sidebar = L.control.sidebar({
  autopan: false,
  closeButton: true,
  position: "left"
})

sidebar.addTo(map);

var panelContent = sidebar.addPanel({
  id: 'redditPosts',
  title: 'Reddit Posts',
  pane: reddit.innerHTML
});

sidebar.open('redditPosts');

L.tileLayer.provider('Stamen.TonerLite').addTo(map);

function foundUser(e){
  var radius = e.accuracy;
  L.marker(e.latlng).addTo(map)
    .bindPopup("You are here.")
  L.circle(e.latlng, radius).addTo(map);
}

function searchNews(e){
    var layer = e.target;
/*     var apiKeyNYT = "Z5gepkLLz3UR8lvG8NisT9APfFHGcj58"
    var req = new XMLHttpRequest(); */
    var name = layer.feature.properties.name;
/*     if(name === "New York"){
      name = "New York City";
    }
    req.open("GET", 'https://api.nytimes.com/svc/search/v2/articlesearch.json?q=coronavirus&fq=glocations:("' + name + '") AND pub_year:("2020")&api-key=' + apiKeyNYT, true);
    req.addEventListener('load', function(){
        if(req.status >= 200 && req.status < 400){
            var response = JSON.parse(req.responseText);
            console.log(response);
            news.update(response, name);
        } else{
            console.log("Error! " + req.statusText);
        }
    })
    req.send(); */
    snoowrap.fromApplicationOnlyAuth({
      userAgent: 'Windows:COVID-2.by.location:v1 (by /u/Bleepenvoy)',
      clientId: 'dK1-vVddhx_5Qw',
      clientSecret: 'wOMGjGtLxA76-y1XGYQx2k87tpc',
      grantType: snoowrap.grantType.CLIENT_CREDENTIALS
    }).then(r => {
      return r.search({
        query: name,
        subreddit: 'coronavirus',
        time: 'week',
        limit: 10
      }).then(function(response){
        reddit.update(response, name)})
    })
}

map.locate({setView:true, maxZoom: 6}) 
map.on('locationfound', foundUser);