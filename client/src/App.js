import React, { Component } from 'react';
import axios from 'axios';
// Mapbox
import ReactMapboxGl, { Layer, Feature, GeoJSONLayer } from 'react-mapbox-gl';
// DayPicker
import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';
 
const Map = ReactMapboxGl({
  accessToken:
    'pk.eyJ1Ijoic2V2aWNoaSIsImEiOiJjazlqNzJmeGcxaDFuM2Vud3RjeGFhNDBnIn0.O2duU4NkncmDSjjjzzd5uQ'
});

const stateDataQuery = '/api/getStateData?date=';
var dateSelection = '2020-04-17';

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
    geojson: {'type': 'FeatureCollection', 'features': []},
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
    console.log(this.state.geojson);
  }

  // when component mounts, first thing it does is fetch all existing data in our db
  // then we incorporate a polling logic so that we can easily see if our db has
  // changed and implement those changes into our UI
  componentDidMount() {
    this.getDataFromDb(stateDataQuery, dateSelection);
    this.getGeojson();
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
      .then((res) => this.setState({ data: res.data }))
      .catch((err) => console.log(err));
  };

  // supply the states geojson data
  getGeojson = () => {
    fetch('/api/getGeojsonData')
      .then((data) => data.json())
      .then((res) => this.setState({ geojson: res.geojson }))
      .catch((err) => console.log(err));
  };

  render() {
    const { data } = this.state;
    const { geojson } = this.state;
    const { selectedDay } = this.state;

    return (
      <div>
        <Map
          style="mapbox://styles/mapbox/dark-v10"
          center= {[-97,39]}          
          containerStyle={{
            height: '75vh',
            width: '90vw'
          }}
          zoom={[3]}
          id='map'
        >
          <GeoJSONLayer
            data={geojson}
            fillPaint={{
              "fill-color": "#FED976",
              "fill-opacity": 0.7,
            }}
          />
        </Map>
        <p>Day: { selectedDay }</p>
        <DayPickerInput onDayChange={this.handleDayChange} />
        <ul>
          {data.length <= 0
            ? 'NO DB ENTRIES YET'
            : data.map((dat, index) => (
                <li style={{ padding: '10px' }} key={index}>
                  <span style={{ color: 'gray' }}> State: </span> {dat.state} <br/>
                  <span style={{ color: 'gray' }}> Cases: </span> {dat.cases} <br/>
                  <span style={{ color: 'gray' }}> Deaths: </span> {dat.deaths}
                </li>
              ))}
        </ul>
      </div>      
    );
  }
}

export default App;
