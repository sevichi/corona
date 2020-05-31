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
// const dbpath = 'mongodb://localhost/covid-19';
// MONGODB_URI=mongodb+srv://sevichi:m0qVaNJzCe0uOvRR@cluster0-z9zpq.mongodb.net/covid-19?retryWrites=true&w=majority -a limitless-garden-71540
const dbpath = 'mongodb+srv://sevichi:m0qVaNJzCe0uOvRR@cluster0-z9zpq.mongodb.net/covid-19?retryWrites=true&w=majority';
mongoose.connect(dbpath, { useNewUrlParser: true });
let db = mongoose.connection;

// Check connection to Mongodb
db.once('open', () => console.log('connected to the database'));
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

module.exports = mongoose;

app.use(cors());

// import state data
const states = require('./us-states');
const geojson = {};
geojson['type'] = 'FeatureCollection';
geojson['features'] = [];

states['features'].forEach(ft => {
  geojson['features'].push(ft);
});
// geojson['features'].push(states['features'][0]);
// geojson['features'].push(states['features'][3]);

// color function
function getColor(c) {
  return c > 10000 ? '#800026' :
         c > 5000  ? '#BD0026' :
         c > 1000  ? '#E31A1C' :
         c > 500   ? '#FC4E2A' :
         c > 100   ? '#FD8D3C' :
         c > 10    ? '#FEB24C' :
         c > 0     ? '#FED976' :
                     '#FFEDA0';
}

// routes here
router.get('/getGeojsonData', (req, res) => {
  if (!req.query.date) {
    return res.json({success: true, geojson: geojson});

  } else if (req.query.date) {
    var listOfgeojson = [];

    // count the number of states
    var numStates = states['features'].length;

    function checkCount() {
      if (numStates == 0) {
          return res.json({success: true, geojson: listOfgeojson});
   
      };
    };

    states['features'].forEach(ft => {
      State.find({date: req.query.date, state: ft['properties']['name']}, (err, docs) => {
        // new object with layer and style
        var newgeojson = {};

        // new layer
        var layer = {};
        layer['type'] = 'FeatureCollection';
        layer['features'] = [];

        // new style
        var fillPaint = {};
        fillPaint['fill-opacity'] = 0.7;
        if (docs.length) {
          // console.log(docs[0].state, getColor(docs[0].cases))
          // create the fill color
          fillPaint['fill-color'] = getColor(docs[0].cases);
          newgeojson['fillPaint'] = fillPaint;

          // create the geojson layer
          layer['features'].push(ft);
          newgeojson['geojson'] = layer;

          // push the layer and geojson into data array
          listOfgeojson.push(newgeojson);

          // check the count
          numStates--;
          checkCount();
        } else {
          // create the fill color for 0 cases
          fillPaint['fill-color'] = getColor(0);
          newgeojson['fillPaint'] = fillPaint;

          // create the geojson layer
          layer['features'].push(ft);
          newgeojson['geojson'] = layer;

          // push the layer and geojson into data array
          listOfgeojson.push(newgeojson);

          // check the count
          numStates--;
          checkCount();
        };
      });
    });    
  }
});

router.get('/getStateData', (req, res) => {
  if (!req.query.date) {
    State.find({}, function(err, docs) {
      if (err) return res.json({success: false, error: err});
      return res.json({success: true, data: docs});
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

router.use(function(req, res) {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.use('/api', router);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
}

app.listen(port, () => console.log(`Server listening on port ${port}`));

app.get('*',(req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'build', 'index.html'));
});
// Serve the static files from the React app
// app.use(express.static(path.join(__dirname, 'client/build')));

// Handles any requests that don't match the ones above
// app.get('*', (req,res) =>{
//     res.sendFile(path.join(__dirname+'/client/public/index.html'));
// });





const csvtojson = require('csvtojson');


/* Refresh data */
// State.remove({}, function(err) {
//   if (err) throw err;
//   State.find({}, function(err, docs) {
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



