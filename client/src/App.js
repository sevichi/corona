import React, { Component } from 'react';
import axios from 'axios';
// import './App.css';

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
  };

  // when component mounts, first thing it does is fetch all existing data in our db
  // then we incorporate a polling logic so that we can easily see if our db has
  // changed and implement those changes into our UI
  componentDidMount() {
    this.getDataFromDb();
    if (!this.state.intervalIsSet) {
      let interval = setInterval(this.getDataFromDb, 1000);
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
  getDataFromDb = () => {
    fetch('/api/getStateData?date=2020-02-25')
      .then((data) => data.json())
      .then((res) => this.setState({ data: res.data }))
      .catch((err) => console.log(err));
  };

  render() {
    const { data } = this.state;
    return (
      <div>
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
