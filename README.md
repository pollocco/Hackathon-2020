# Hackathon 2020
 Map project for Team 1. BeaverHacks Hackathon 2020. Check out the working [demo](pollocco.github.io)!
# What is it?
This is an interactive, dynamic photo gallery situated on a map. The user can view pseudorandomly obtained photos from the Flickr API, as well as photos obtained for a specific area by dragging a camera icon to their desired location. In addition, the user can mouseover states to view the current known number of cases (obtained from the New York TImes GitHub upon loading) as well as click a state to see recent Reddit posts from r/Coronavirus sorted by "New".
# What does it use?
This web app uses [Leaflet.js](https://leafletjs.com/) as the mapping framework with [OpenStreetMap](https://wiki.openstreetmap.org/wiki/Main_Page) and [Maptiler](https://www.maptiler.com/) as the tile providers. Data on coronavirus cases in the U.S. by state provided by [New York Times GitHub repo](https://github.com/nytimes/covid-19-data) in CSV format and automatically updates as new data is released. The [Flickr](https://www.flickr.com/services/api/) and [Reddit](https://www.reddit.com/wiki/api) APIs are used to obtain the photographs and news stories. [snoowrap](https://github.com/not-an-aardvark/snoowrap) and [flickr-sdk](https://www.npmjs.com/package/flickr-sdk) were used to access the APIs. [Node.js](https://nodejs.org/en/) and [npm](https://www.npmjs.com/) are used on the backend and [parcel](https://parceljs.org/) was used to manage dependencies. Additional plugins include [leaflet-sidebar-v2](https://github.com/noerw/leaflet-sidebar-v2), [mapbox-gl](https://docs.mapbox.com/mapbox-gl-js/api/), [mapbox-gl-leaflet](https://github.com/mapbox/mapbox-gl-leaflet), [leaflet-providers](https://github.com/leaflet-extras/leaflet-providers) and [leaflet-markercluster](https://github.com/Leaflet/Leaflet.markercluster). GeoJSON data for U.S. states found in [this tutorial](https://leafletjs.com/examples/choropleth/), with attribution to [Mike Bostock](http://bost.ocks.org/mike). [csvtojson](https://www.npmjs.com/package/csvtojson) along with [request](https://github.com/request/request) were used to convert the New York Times data to JSON format.  
# Installation
Working installations of [Node.js](https://nodejs.org/en/download/) and [Git](https://git-scm.com/downloads) are required to run the application. You must also have access to the APIs for [Reddit](https://github.com/reddit-archive/reddit/wiki/OAuth2) and [Flickr](https://www.flickr.com/services/api/misc.api_keys.html). 

Clone the repository to a directory of your choice. In the root directory of the repository, create a file called <code>config.json</code> and insert the following: 
<pre><code>{
    "config": {
        "FLAK": "(INSERT FLICKR API KEY HERE)",
        "RCLID": "(INSERT REDDIT CLIENT ID HERE)",
        "RCLSC": "(INSERT REDDIT CLIENT SECRET HERE)"
    }
}</pre></code>
After this is done, simply <code>npm install</code> and <code>npm start</code>. Once parcel has built the program, it can be viewed at http://localhost:1234.
