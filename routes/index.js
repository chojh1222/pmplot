var express = require('express');
var googleMaps = require('@google/maps')
var util = require('util')
var proj4 = require('proj4')
var request = require('request');
var {logger} = require('../logger')

var router = express.Router();
var googleMapsClient = googleMaps.createClient({
  key: process.env.PLACES_API_KEY
})

var wgs84 = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs';
// var tm = '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs'
// var tm = '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs'
var tm = '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs'
// var tm = '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43'

function to_tm(coord) {
  var ret = proj4(tm, coord)
  return ret
}
function from_tm(coord) {
  var ret = proj4(tm, wgs84, coord)
  return ret
}
function proj(x, y, input_coord='WGS84', output_coord='TM') {
  return new Promise(function(resolve, reject) {
    var url = "https://dapi.kakao.com/v2/local/geo/transcoord.json"
    var queryParams = '?' + encodeURIComponent('x') + '=' + encodeURIComponent(x)
    queryParams += '&' + encodeURIComponent('y') + '=' + encodeURIComponent(y)
    queryParams += '&' + encodeURIComponent('input_coord') + '=' + encodeURIComponent(input_coord)
    queryParams += '&' + encodeURIComponent('output_coord') + '=' + encodeURIComponent(output_coord)

    request({
      url: url + queryParams,
      method: 'GET',
      headers: {
        'Authorization': 'KakaoAK ' + process.env.COORD_API_KEY
      }
    }, function (error, response, body) {
      if(error) {
        return reject(error)
      }
      // console.log('Status', response.statusCode);
      // console.log('Headers', JSON.stringify(response.headers));
      // console.log('Reponse received', JSON.parse(body));
      resolve(JSON.parse(body))
    })
  })
}
function getMeasureYear(stationName) {
  return new Promise(function(resolve, reject) {
    var url = 'http://openapi.airkorea.or.kr/openapi/services/rest/ArpltnStatsSvc/getMsrstnAcctoLastDcsnDnsty';
    var queryParams = '?' + encodeURIComponent('ServiceKey') + '=' + process.env.AIR_API_KEY; /* Service Key*/
    queryParams += '&' + encodeURIComponent('numOfRows') + '=' + encodeURIComponent('10000'); /* 한 페이지 결과 수 */
    queryParams += '&' + encodeURIComponent('pageNo') + '=' + encodeURIComponent('1'); /* 페이지 번호 */
    queryParams += '&' + encodeURIComponent('stationName') + '=' + encodeURIComponent(stationName); /* 측정소명 */
    queryParams += '&' + encodeURIComponent('searchCondition') + '=' + encodeURIComponent('YEAR'); /* 검색 조건 (년도별 : YEAR, 월별: MONTH, 일별 : DAILY) */
    queryParams += '&' + encodeURIComponent('_returnType') + '=' + encodeURIComponent('json');

    request({
      url: url + queryParams,
      method: 'GET',
    }, function (error, response, body) {
      if(error) {
        return reject(error)
      }
      // console.log('Status', response.statusCode);
      // console.log('Headers', JSON.stringify(response.headers));
      // console.log('Reponse received', body);
      // console.log(JSON.parse(body))
      resolve(JSON.parse(body).list)
    })
  })
}

function getMeasure(stationName, dataTerm='DAILY') {
  return new Promise(function(resolve, reject) {
    var url = 'http://openapi.airkorea.or.kr/openapi/services/rest/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty';
    var queryParams = '?' + encodeURIComponent('ServiceKey') + '=' + process.env.AIR_API_KEY; /* Service Key*/
    queryParams += '&' + encodeURIComponent('numOfRows') + '=' + encodeURIComponent('10000'); /* 한 페이지 결과 수 */
    queryParams += '&' + encodeURIComponent('pageNo') + '=' + encodeURIComponent('1'); /* 페이지 번호 */
    queryParams += '&' + encodeURIComponent('stationName') + '=' + encodeURIComponent(stationName); /* 측정소 이름 */
    queryParams += '&' + encodeURIComponent('dataTerm') + '=' + encodeURIComponent(dataTerm); /* 요청 데이터기간 (하루 : DAILY, 한달 : MONTH, 3달 : 3MONTH) */
    queryParams += '&' + encodeURIComponent('ver') + '=' + encodeURIComponent('1.0'); /* 버전별 상세 결과 참고문서 참조 */
    queryParams += '&' + encodeURIComponent('_returnType') + '=' + encodeURIComponent('json');

    request({
      url: url + queryParams,
      method: 'GET',
    }, function (error, response, body) {
      if(error) {
        return reject(error)
      }
      // console.log('Status', response.statusCode);
      // console.log('Headers', JSON.stringify(response.headers));
      // console.log('Reponse received', body);
      resolve(JSON.parse(body).list)
    })
  })

}

function getNearbyStations(tmX, tmY) {
  return new Promise(function(resolve, reject) {
    var url = 'http://openapi.airkorea.or.kr/openapi/services/rest/MsrstnInfoInqireSvc/getNearbyMsrstnList';
    var queryParams = '?' + encodeURIComponent('ServiceKey') + '=' + process.env.AIR_API_KEY; /* Service Key*/
    queryParams += '&' + encodeURIComponent('tmX') + '=' + encodeURIComponent(tmX); /* TM측정방식 X좌표 */
    queryParams += '&' + encodeURIComponent('tmY') + '=' + encodeURIComponent(tmY); /* TM측정방식 Y좌표 */
    // queryParams += '&' + encodeURIComponent('ver') + '=' + encodeURIComponent('1.0'); /* 버전 미 포함시 TM좌표 기준 가까운 측정소 표출하고 1.0 호출시 도로명주소검색 API 좌표로 가까운 측정소 표출 */
    queryParams += '&' + encodeURIComponent('_returnType') + '=' + encodeURIComponent('json');

    request({
      url: url + queryParams,
      method: 'GET',
    }, function (error, response, body) {
      if(error) {
        return reject(error)
      }
      // console.log('Status', response.statusCode);
      // console.log('Headers', JSON.stringify(response.headers));
      // console.log('Reponse received', body);
      resolve(JSON.parse(body))
    })
  })
}
function getStations() {
  return new Promise(function(resolve, reject) {
    var url = 'http://openapi.airkorea.or.kr/openapi/services/rest/MsrstnInfoInqireSvc/getMsrstnList';
    var queryParams = '?' + encodeURIComponent('ServiceKey') + '=' + process.env.AIR_API_KEY; /* Service Key*/
    queryParams += '&' + encodeURIComponent('numOfRows') + '=' + encodeURIComponent('1000'); /* 한 페이지 결과 수 */
    queryParams += '&' + encodeURIComponent('pageNo') + '=' + encodeURIComponent('1'); /* 페이지 번호 */
    // queryParams += '&' + encodeURIComponent('addr') + '=' + encodeURIComponent('부천시'); /* 주소 이름 */
    queryParams += '&' + encodeURIComponent('_returnType') + '=' + encodeURIComponent('json');

    request({
      url: url + queryParams,
      method: 'GET',
    }, function (error, response, body) {
      if(error) {
        return reject(error)
      }
      // console.log('Status', response.statusCode);
      // console.log('Headers', JSON.stringify(response.headers));
      // console.log('Reponse received', body);
      resolve(JSON.parse(body).list)
    })
  })
}

function geocodeLatLng(lat, lng) {
  return new Promise(function(resolve, reject) {
    var url = 'https://maps.googleapis.com/maps/api/geocode/json'
    var queryParams = '?' + encodeURIComponent('latlng') + '=' + `${lat},${lng}`; /* Service Key*/
    queryParams += '&' + encodeURIComponent('key') + '=' + process.env.PLACES_API_KEY
    queryParams += '&' + encodeURIComponent('language') + '=' + 'ko'

    request({
      url: url + queryParams,
      method: 'GET',
    }, function (error, response, body) {
      if(error) {
        return reject(error)
      }
      // console.log('Status', response.statusCode);
      // console.log('Headers', JSON.stringify(response.headers));
      // console.log('Reponse received', body);
      resolve(JSON.parse(body))
    })
  })
}

var station_list
getStations()
    .then(function(stations) {
      station_list = stations
    })
    .catch(function(err) {
      logger.error(err)
    })

/* GET home page. */
router.get('/', async function(req, res, next) {
  try {
    if(!station_list) {
      station_list = await getStations()
    }
    res.render('index', {
      title: 'Express',
      stations: station_list
    });
  }
  catch(err) {
    logger.error(err)
    next(err)
  }
});

router.get('/stations', async function(req, res, next) {
  try {
    const {lat, lng} = req.query
    let result = await proj(lng, lat)
    const tmX = result.documents[0].x
    const tmY = result.documents[0].y
    result = await getNearbyStations(tmX, tmY)
    res.json(result)
  }
  catch(err) {
    logger.error(err)
    next(err)
  }
})

router.get('/measure/:stationName', async function(req, res, next) {
  try {
    const {stationName} = req.params
    const {dataTerm} = req.query
    if(dataTerm == 'DAILY' || dataTerm == 'MONTH') {
      var result = await getMeasure(stationName, dataTerm)
    }
    else {
      var result = await getMeasureYear(stationName)
    }
    res.json(result)
  }
  catch(err) {
    logger.error(err)
    next(err)
  }
})



router.get('/autocomplete/:query', async function(req, res, next) {
  googleMapsClient.placesQueryAutoComplete({
    input: req.params.query,
    language: 'ko'
  }, function(err, response) {
    if(err) {
      return next(err)
    }
    res.json(response.json.predictions)
  })
})

router.get('/search/:query', async function(req, res, next) {
  const googlePlaces = util.promisify(googleMapsClient.places)
  try {
    const response = await googlePlaces({
      query: req.params.query,
      language: 'ko'
    })

    // var coord = {x: 181572.047774, y: 443630.889536}
    // coord = from_tm(coord)
    // console.log(coord)
    // response.json.results[0].geometry.location = { lat: coord.y, lng: coord.x }
    // console.log(response.json.results[0].geometry.location)

    response.json.results[0].geometry.location = { lat: 37.480033, lng: 126.799906 }
    const location = response.json.results[0].geometry.location
    const {lat, lng} = location
    const loc_tm = to_tm({x: lng, y: lat})
    const loc = from_tm(loc_tm)
    console.log(location)
    console.log(loc_tm)
    console.log(loc)

    res.render('result', {
      title: req.params.query + ' 검색결과',
      results: response.json.results,
      query: req.params.query
    })
  }
  catch(err) {
    logger.error(err)
    next(err)
  }

})

module.exports = router;
