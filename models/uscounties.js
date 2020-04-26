const mongoose = require('../database');

const recordSchema = new mongoose.Schema({
  date: {
	type: Date,
	required: true,
  },
  county: {
  	type: String,
  	required: true,
  },
  state: {
  	type: String,
  	required: true,
  },
  fips: {
  	type: Number,
  },
  cases: {
  	type: Number,
  	required: true,
  },
  deaths: {
  	type: Number,
  	required: true,
  },  	
  // date + fips
  rec_id: {
	type: String,
	unique: true,
  },
});

const Record = mongoose.model('Record', recordSchema);

module.exports = Record;