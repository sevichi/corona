// Dependencies
const mongoose = require('mongoose');
const express = require('express');
var cors = require('cors');
const bodyparser = require('body-parser');
const logger = require('morgan');

// Mongoose Data Models
const Record = require('./../models/uscounties');
const State = require('./../models/states');

// Set up express
const port = process.env.PORT || 3001;
const app = express();
const router = express.Router();
const path = require('path');

// Connect to Mongodb
const dbpath = 'mongodb://localhost/covid-19';
mongoose.connect(dbpath, { useNewUrlParser: true });
let db = mongoose.connection;

// Check connectino to Mongodb
db.once('open', () => console.log('connected to the database'));
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

module.exports = mongoose;

app.use(cors());

// routes here
router.get('/getData', (req, res) => {
  Record.find({}, function(err, docs) {
    if (err) return res.json({ success: false, error: err });
    return res.json({ success: true, data: docs });
  });
});

router.get('/getStateData', (req, res) => {
  if (!req.query.date) {
    State.find({}, function(err, docs) {
      if (err) return res.json({success: false, error: err});
      return res.json({success: true, data: docs});
    });
  } else if (req.query.date && req.query.count) {
    State.find({date: req.query.date}, function(err, docs) {
      if (err) return res.json({success: false, error: err});
      var recordsProcessed = 0;
      var numDeaths = 0;
      var numCases = 0;
      function deaths() {
        return res.json({success: true, deaths: numDeaths});
      }
      function cases() {
        return res.json({success: true, cases: numCases});
      }
      docs.forEach(record => {
        recordsProcessed ++;
        numDeaths += record.deaths;
        numCases += record.cases;
        if (recordsProcessed == docs.length) {
          if (req.query.count == 'cases') {
            cases();
          } else if (req.query.count == 'deaths') {
            deaths();
          }
        }
      });
    });      
  } else if (req.query.date) {
    State.find({date: req.query.date}, function(err, docs) {
      if (err) return res.json({success: false, error: err});
      return res.json({success: true, data: docs});
    });    
  }
});


router.get('/getDayChange', (req, res) => {
  var listOfStates = [];

  function createStateData() {
    var stateCount = listOfStates.length-1;
    console.log('total: ' + stateCount);
    var stateData = [];

    listOfStates.forEach(st => {
      var stateDoc = {};

      function checkCount() {
        // return response if there are no states left to check
        if (stateCount == 0) {
          return res.json({success: true, data: stateData});  
        }; 
      };
      // set the state to be the state you're looking for
      stateDoc['state'] = st;

      State.find({state: st, date: req.query.date}, (err, docs) =>{
        if (docs.length == 0) {
          stateDoc['cases'] = 0;
          stateDoc['deaths'] = 0;
          stateData.push(stateDoc);
          stateCount--;
          checkCount();
        } else {
          var caseCount = docs[0].cases;
          var deathCount = docs[0].deaths;
          var currDate = new Date(req.query.date);
          var prevDate = new Date(req.query.date);

          prevDate.setDate(currDate.getDate()-1);

          State.find({state: st, date: prevDate}, (err, docs) =>{
            if (docs.length == 0) {
              stateDoc['cases'] = caseCount;
              stateDoc['deaths'] = deathCount;
              stateData.push(stateDoc);
              stateCount--;
              checkCount();
            } else {
              caseCount -= docs[0].cases;
              deathCount -= docs[0].deaths;
              stateDoc['cases'] = caseCount;
              stateDoc['deaths'] = deathCount;
              stateData.push(stateDoc);
              stateCount--; 
              checkCount();
            }              
          });
        };
      });          
    });  
  }

  State.find({}, function(err, docs) {
    var recordsProcessed = 0;
    docs.forEach(record => {
      recordsProcessed ++;
      if (listOfStates.indexOf(record.state) === -1) {
        listOfStates.push(record.state)
      }
      if (recordsProcessed == docs.length) {
        createStateData();
      }
    });
  });
});

router.delete('/deleteData', (req, res) => {
  const { id } = req.body;
  Record.findAndRemove({}, (err) => {
    if (err) return res.send(err);
    return res.json({ success: true });
  });  
});

app.use('/api', router);
app.listen(port, () => console.log(`Server listening on port ${port}`));

// Serve the static files from the React app
// app.use(express.static(path.join(__dirname, 'client/build')));

// Handles any requests that don't match the ones above
// app.get('*', (req,res) =>{
//     res.sendFile(path.join(__dirname+'/client/public/index.html'));
// });





const csvtojson = require('csvtojson');


/* Refresh data */
// Record.remove({}, function(err) {
//   if (err) throw err;
//   Record.find({}, function(err, docs) {
//     if (err) throw err;
//     console.log('There are ' + docs.length + ' records.');
//   });
// });

// csvtojson()
//   .fromFile('./covid-19-data/us-counties.csv')
//   .then(csvData => {

//     // Add new data
//   	csvData.forEach(record => {
//   	  const rec = new Record();
//       rec.date = record.date;
//       rec.county = record.county;
//       rec.state = record.state;
//       rec.fips = record.fips;
//       rec.cases = record.cases
//       rec.deaths = record.deaths;
//       rec.rec_id = mongoose.Types.ObjectId();

//       rec.save(function(err) {
//         if (err) throw err;
//         console.log('record saved.');
//       });
//   	});
//   });

/* States */
// csvtojson()
//   .fromFile('./covid-19-data/us-states.csv')
//   .then(csvData => {

//     // Add new data
//   	csvData.forEach(record => {
//   	  const rec = new State();
//       rec.date = record.date;
//       rec.state = record.state;
//       rec.fips = record.fips;
//       rec.cases = record.cases
//       rec.deaths = record.deaths;

//       rec.save(function(err) {
//         if (err) throw err;
//         console.log('record saved.');
//       });
//   	});
//   });

/*
var currDate = new Date('2020-04-17');
var prevDate = new Date('2020-04-17');
prevDate.setDate(currDate.getDate()-1);

State.find({ $or: [ {date: currDate}, {date: prevDate} ] }, function(err, docs) {
  if (err) throw err;
  var numCases = 0;
  var prevNumCases = 0;
  var numDeaths = 0;
  var prevNumDeaths = 0;
  var recordsProcessed = 0;
  console.log('On 2020-04-17: ');
  function cases() {
  	dayCases = numCases - prevNumCases;
  	console.log('There were ' + dayCases + ' cases.');
  }
  function deaths() {
  	dayDeaths = numDeaths - prevNumDeaths;
  	console.log('There were ' + dayDeaths + ' deaths.');
  }

  docs.forEach(record => {
  	recordsProcessed ++;
  	if (record.date.getTime() === currDate.getTime()) {
    	numCases += record.cases;
    	numDeaths += record.deaths;		
  	} else if (record.date.getTime() === prevDate.getTime()) {
    	prevNumCases += record.cases;
    	prevNumDeaths += record.deaths;  		
  	}

    if (recordsProcessed == docs.length) {
      cases();
      deaths();
    };
  });
});
*/



