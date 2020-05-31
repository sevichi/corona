import React, { Component } from 'react';
// import ReactDOM from 'react-dom';
import axios from 'axios';
// Mapbox
// import ReactMapboxGl, { Layer, Feature, GeoJSONLayer } from 'react-mapbox-gl';
// import * as MapboxGL from 'mapbox-gl';
import mapboxgl from 'mapbox-gl';
// DayPicker
import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';
// Material UI
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';

// map init
const accessToken = 'pk.eyJ1Ijoic2V2aWNoaSIsImEiOiJjazlqNzJmeGcxaDFuM2Vud3RjeGFhNDBnIn0.O2duU4NkncmDSjjjzzd5uQ';
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
const stateDataQuery = 'http://limitless-garden-71540.herokuapp.com/api/getStateData?date=';
const geojsonQuery = 'http://limitless-garden-71540.herokuapp.com/api/getGeojsonData?date=';
var dateSelection = '2020-1-20';

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
    hoveredState: 'Hover over a state',
    hoveredStateCases: null,
    hoveredStateDeaths: null,
  };

  constructor(props) {
    super(props);
    this.handleDayChange = this.handleDayChange.bind(this);
    this.colorLegend = React.createRef();
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
    const date = this.formatDate(day);
    // this.setState({ selectedDay: date });
    this.setDate(day);
    this.getDataFromDb(stateDataQuery, date);
    this.getGeojson(geojsonQuery, date);
    this.updateGeojson(geojsonQuery, date);
  }

  setDate = (newDate) => {
    const date = newDate || new Date();
    this.setState({
      selectedDay:
        date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate()
    });
  };

  getPreviousDate = () => {
    const { selectedDay } = this.state

    const currentDayInMilli = new Date(selectedDay).getTime()
    const oneDay = 1000 * 60 *60 *24
    const previousDayInMilli = currentDayInMilli - oneDay
    const previousDate = new Date(previousDayInMilli)

    this.handleDayChange(previousDate);
  }

  getNextDate = () => {
    const { selectedDay } = this.state

    const currentDayInMilli = new Date(selectedDay).getTime()
    const oneDay = 1000 * 60 *60 *24
    const nextDayInMilli = currentDayInMilli + oneDay
    const nextDate = new Date(nextDayInMilli)

    this.handleDayChange(nextDate);
  }

  // color function
  getColor(c) {
    return c > 10000 ? '#800026' :
           c > 5000  ? '#BD0026' :
           c > 1000  ? '#E31A1C' :
           c > 500   ? '#FC4E2A' :
           c > 100   ? '#FD8D3C' :
           c > 10    ? '#FEB24C' :
           c > 0     ? '#FED976' :
                       '#FFEDA0';
  }

  // hover state
  displayState(state) {
    if (state) {
      const { data } = this.state;   
      if (!data[0]) {
        this.setState({
          hoveredState: state,
          hoveredStateCases: 'No records for this date',
        });   
      } else {
        var count = data.length;
        var set = false;
        data.forEach(st => {
          if (state === st['state']) {
            this.setState({
              hoveredState: st['state'],
              hoveredStateCases: 'Cases: ' + st['cases'],
              hoveredStateDeaths: 'Deaths: ' + st['deaths'],
            })
            set = true;
          }
          count--;
        });
        if (count === 0 && !set) {
          this.setState({
            hoveredState: state,
            hoveredStateCases: 'No records for this date',
            hoveredStateDeaths: null,
          });            
        }
      }
    } else {
      this.setState({ 
        hoveredState: 'Hover over a state', 
        hoveredStateCases: null, 
        hoveredStateDeaths: null, 
      });
    }

  }

  // when component mounts, first thing it does is fetch all existing data in our db
  // then we incorporate a polling logic so that we can easily see if our db has
  // changed and implement those changes into our UI
  componentDidMount() {
    const date = this.formatDate(dateSelection);
    this.getDataFromDb(stateDataQuery, date);
    this.getGeojson(geojsonQuery, date);
    if (!this.state.intervalIsSet) {
      let interval = setInterval(this.getDataFromDb(stateDataQuery, date), 1000);
      this.setState({ intervalIsSet: interval });
    }

    // load the color legend
    const cl = this.colorLegend.current;
    var grades = [0, 10, 100, 500, 1000, 5000, 10000];
    cl.innerHTML += '<i style="background:' + this.getColor(0) + 
    ';width: 18px;height: 16px;position: absolute;float: left;margin-right: 8px;opacity: 0.7;"></i> ' 
    + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + '0' + '<br>';    
    for (var i = 0; i < grades.length; i++) {
      cl.innerHTML += '<i style="background:' + this.getColor(grades[i] + 1) + 
      ';width: 18px;height: 16px;position: absolute;float: left;margin-right: 8px;opacity: 0.7;"></i> ' 
      + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + (grades[i]+1) + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }

    // mapbox init
    mapboxgl.accessToken = accessToken;
    this.map = new mapboxgl.Map({
      container: 'map', // html element id in render
      style: 'mapbox://styles/mapbox/dark-v10',
      center: [-97,39], // note: lon comes before lat
      zoom: [3],
      scrollZoom: false,
    });

    // mapbox onload
    this.map.on('load', async() => {
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
            this.map.setPaintProperty(st.geojson.features[0].properties.name, 'fill-color', 'white');
            this.displayState(st.geojson.features[0].properties.name);
          });

          this.map.on('mouseleave', st.geojson.features[0].properties.name, () => {
            hoverCount--;
            if (hoverCount === 0) {
              this.map.getCanvas().style.cursor = '';
              this.displayState(null);
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
      .then((res) => {
        console.log(res);
        this.setState({ geojson: res.geojson });
      })
      .catch((err) => console.log(err));
  };

  updateGeojson = (geojsonQuery, dateSelection) => {
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

  render() {

    const { data } = this.state;
    const { selectedDay } = this.state;
    const classes = useStyles;
    const { hoveredState } = this.state;
    const { hoveredStateCases } = this.state;
    const { hoveredStateDeaths } = this.state;

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
        <div style={{
          lineHeight: '18px',
          textAlign: 'left',
          'color': '#555',
          'padding': '6px 8px',
          'font': '16px/18px Arial, Helvetica, sans-serif',
          'background': 'rgba(255,255,255,0.7)',
          boxShadow: '0 0 15px rgba(0,0,0,0.2)',
          'position': 'absolute',
          zIndex: '1 !important',
          'top': '10%',
          'left': '2%',
          whiteSpace: 'normal',          
        }}><b>{ hoveredState }</b>
          { hoveredStateCases ? <div style={{'font': '14px/16px Arial, Helvetica, sans-serif'}}><em>{ hoveredStateCases }</em></div> : null}
          { hoveredStateDeaths ? <div style={{'font': '14px/16px Arial, Helvetica, sans-serif'}}><em>{ hoveredStateDeaths }</em></div> : null}
        </div>
        <div ref={this.colorLegend} style={{
          lineHeight: '18px',
          textAlign: 'left',
          'color': '#555',
          'padding': '6px 8px',
          'font': '14px/16px Arial, Helvetica, sans-serif',
          'background': 'rgba(255,255,255,0.7)',
          boxShadow: '0 0 15px rgba(0,0,0,0.2)',
          'position': 'absolute',
          zIndex: '1 !important',
          'top': '50%',
          'left': '2%',
          whiteSpace: 'normal',
        }}><b>Number of Cases</b><br/></div>
        <p style={{
          'font':'16px/18px Arial, Helvetica, sans-serif',
        }}>Day: { selectedDay }</p>
        <DayPickerInput 
          onDayChange={this.handleDayChange} 
          selectedDay={ selectedDay }
          value={ selectedDay }
          style={{
          'font':'14px/16px Arial, Helvetica, sans-serif',
        }}/>
        <Button onClick={this.getPreviousDate}>Previous</Button>
        <Button onClick={this.getNextDate}>Next</Button>
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
              ? (<TableRow key={1}><TableCell component="th" scope="row">There are no records for this date</TableCell></TableRow>)
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
