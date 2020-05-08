import React, { Component } from 'react';
import axios from 'axios';
// Mapbox
import ReactMapboxGl, { Layer, Feature, GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
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
const Map = ReactMapboxGl({
  accessToken:
    'pk.eyJ1Ijoic2V2aWNoaSIsImEiOiJjazlqNzJmeGcxaDFuM2Vud3RjeGFhNDBnIn0.O2duU4NkncmDSjjjzzd5uQ'
});

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
var dateSelection = '2020-04-17';

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
    selectedDay: '2020-04-17',
    geojson: geojsonList,
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

  render() {
    const { data } = this.state;

    const geojson = this.state.geojson;

    const { selectedDay } = this.state;
    const classes = useStyles;

    return (
      <div style={{justifyContent: 'center'}}>
        <Map
          style="mapbox://styles/mapbox/dark-v10"
          center= {[-97,39]}          
          containerStyle={{
            height: '75vh',
            width: '99vw'
          }}
          zoom={[3]}
          id='map'
        >
        {geojson.length <= 0 
        ? 'NO GEOJSON'
        : geojson.map((gl, index) => (
          <GeoJSONLayer key={index}
            data={gl.geojson}
            fillPaint={gl.fillPaint}
            linePaint={linePaint}
          />
          ))}
        </Map>
        <p>Day: { selectedDay }</p>
        <DayPickerInput onDayChange={this.handleDayChange} />
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
