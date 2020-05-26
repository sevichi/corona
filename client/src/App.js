import React, { Component } from 'react';
// import ReactDOM from 'react-dom';
import axios from 'axios';
// Mapbox
import ReactMapboxGl, { Layer, Feature, GeoJSONLayer } from 'react-mapbox-gl';
// import * as MapboxGL from 'mapbox-gl';
import mapboxgl from 'mapbox-gl';
// DayPicker
import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';
// Material UI
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';

// map init
const accessToken = 'pk.eyJ1Ijoic2V2aWNoaSIsImEiOiJjazlqNzJmeGcxaDFuM2Vud3RjeGFhNDBnIn0.O2duU4NkncmDSjjjzzd5uQ';
// const Map = ReactMapboxGl({
//   accessToken:
//     'pk.eyJ1Ijoic2V2aWNoaSIsImEiOiJjazlqNzJmeGcxaDFuM2Vud3RjeGFhNDBnIn0.O2duU4NkncmDSjjjzzd5uQ',
//   scrollZoom: false,
// });
var stateColors = {};
var hoverCount = 0;

// map styles
const linePaint: MapboxGL.LinePaint = {
  'line-color': 'white',
  'line-width': 2,
};
const fillPaint: MapboxGL.fillPaint = {
  "fill-color": "white",
  "fill-opacity": 0.7,
}

// api calls
const stateDataQuery = '/api/getStateData?date=';
const geojsonQuery = '/api/getGeojsonData?date=';
var dateSelection = '2020-01-21';

// table styles
const useStyles = makeStyles({
  table: {
    minWidth: 400,
  },
});

var newgeojson = {}
newgeojson['geojson'] = {'type': 'FeatureCollection', 'features': []};
newgeojson['fillPaint'] = fillPaint;

var geojsonList = [];
geojsonList.push(newgeojson);

class App extends Component {
  // initialize our state
  state = {
    data: [],
    id: 0,
    message: null,
    intervalIsSet: false,
    idToDelete: null,
    idToUpdate: null,
    objectToUpdate: null,
    selectedDay: dateSelection,
    geojson: geojsonList,
    lng: 5,
    lat: 34,
    zoom: 2,
  };

  constructor(props) {
    super(props);
    this.handleDayChange = this.handleDayChange.bind(this);
  }
  
  formatDate(date) {
      var d = new Date(date),
          month = '' + (d.getMonth() + 1),
          day = '' + d.getDate(),
          year = d.getFullYear();

      if (month.length < 2) 
          month = '0' + month;
      if (day.length < 2) 
          day = '0' + day;

      return [year, month, day].join('-');
  }

  handleDayChange(day) {
    var date = this.formatDate(day);
    this.setState({ selectedDay: date });
    this.getDataFromDb(stateDataQuery, date);
    this.getGeojson(geojsonQuery, date);
    this.updateGeojson();
  }

  // when component mounts, first thing it does is fetch all existing data in our db
  // then we incorporate a polling logic so that we can easily see if our db has
  // changed and implement those changes into our UI
  componentDidMount() {
    this.getDataFromDb(stateDataQuery, dateSelection);
    this.getGeojson(geojsonQuery, dateSelection);
    if (!this.state.intervalIsSet) {
      let interval = setInterval(this.getDataFromDb(stateDataQuery, dateSelection), 1000);
      this.setState({ intervalIsSet: interval });
    }

    // mapbox code
    mapboxgl.accessToken = accessToken;
    this.map = new mapboxgl.Map({
      container: 'map', // html element id in render
      style: 'mapbox://styles/mapbox/dark-v10',
      center: [-97,39], // note: lon comes before lat
      zoom: [3],
      scrollZoom: false,
    });

    this.map.on('load', async() => {
      var prevColor = '';
      await fetch(geojsonQuery + dateSelection).then(() => {
        // const geojson = this.state.geojson;
        this.state.geojson.forEach(st => {
          stateColors[st.geojson.features[0].properties.name] = st.fillPaint['fill-color'];
          this.map.addSource(st.geojson.features[0].id, {
            type: 'geojson',
            data: st.geojson,
          });

          this.map.addLayer({
            id: st.geojson.features[0].properties.name,
            type: 'fill',
            source: st.geojson.features[0].id,
            paint: st.fillPaint,
          });

          this.map.on('mouseenter', st.geojson.features[0].properties.name, () => {
            hoverCount++
            if (hoverCount) {
              this.map.getCanvas().style.cursor = 'pointer';
            }
            this.map.setPaintProperty(st.geojson.features[0].properties.name, 'fill-opacity', 0.5);
            prevColor = this.map.getLayer(st.geojson.features[0].properties.name);
            this.map.setPaintProperty(st.geojson.features[0].properties.name, 'fill-color', 'white');
          });

          this.map.on('mouseleave', st.geojson.features[0].properties.name, () => {
            hoverCount--;
            if (hoverCount == 0) {
              this.map.getCanvas().style.cursor = '';
            }
            this.map.setPaintProperty(st.geojson.features[0].properties.name, 'fill-opacity', 0.7);
            this.map.setPaintProperty(st.geojson.features[0].properties.name, 'fill-color', stateColors[st.geojson.features[0].properties.name]);
          });
        });
      });
    });
  }

  // never let a process live forever
  // always kill a process everytime we are done using it
  componentWillUnmount() {
    if (this.state.intervalIsSet) {
      clearInterval(this.state.intervalIsSet);
      this.setState({ intervalIsSet: null });
    }
  }

  // our first get method that uses our backend api to
  // fetch data from our data base
  getDataFromDb = (stateDataQuery, dateSelection) => {
    fetch(stateDataQuery + dateSelection)
      .then((data) => data.json())
      .then((res) => this.setState({ data: res.data}))
      .catch((err) => console.log(err));
  };

  // supply the states geojson data
  getGeojson = (geojsonQuery, dateSelection) => {
    fetch(geojsonQuery + dateSelection)
      .then((data) => data.json())
      .then((res) => this.setState({ geojson: res.geojson }))
      .catch((err) => console.log(err));
  };

  updateGeojson = () => {
    fetch(geojsonQuery + dateSelection)
      .then((data) => data.json())
      .then((res) => {
        const geojson = this.state.geojson;
        geojson.forEach(st => {
          this.map.setPaintProperty(st.geojson.features[0].properties.name, 'fill-color', st.fillPaint['fill-color']);
          stateColors[st.geojson.features[0].properties.name] = st.fillPaint['fill-color'];
        });
      });    
  };
  // update geojson one by one
  // updateGeojson = (geojsonQuery, dateSelection) => {
  //   fetch(geojsonQuery + dateSelection)
  //     .then((data) => data.json())
  //     .then((res) => this.setState(state => {
  //       const gList = 
  //     }))
  // }

  render() {

    const { data } = this.state;
    // const geojson = this.state.geojson;
    const { selectedDay } = this.state;
    const classes = useStyles;

    return (
      <div 
        style={{justifyContent: 'center'}} 
      >
        <div id='map' style={{
          position: 'block',
          top: 0,
          bottom: 0,
          width: '99vw',
          height: '75vh',
        }}/>
        <p>Day: { selectedDay }</p>
        <DayPickerInput 
          onDayChange={this.handleDayChange} 
          selectedDay={this.state.selectedDay}
        />
        <TableContainer component={Paper}>
          <Table className={classes.table} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>State</TableCell>
                <TableCell align="right">Cases</TableCell>
                <TableCell align="right">Deaths</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length <= 0
              ? 'NO DB ENTRIES YET'
              : data.map((dat, index) => (
                <TableRow key={index}>
                  <TableCell component="th" scope="row">
                    {dat.state}
                  </TableCell>
                  <TableCell align="right">{dat.cases}</TableCell>
                  <TableCell align="right">{dat.deaths}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>      
    );
  }
}

export default App;
