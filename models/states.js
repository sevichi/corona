// const mongoose = require('../database');
const mongoose = require('mongoose');

const stateSchema = new mongoose.Schema({
  date: {
	type: Date,
	required: true,
  },
  state: {
  	type: String,
  	required: true,
  },
  fips: {
  	type: Number,
    required: true,
  },
  cases: {
  	type: Number,
  	required: true,
  },
  deaths: {
  	type: Number,
  	required: true,
  },  	
});

const State = mongoose.model('State', stateSchema);

module.exports = State;