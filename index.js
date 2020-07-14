
var moment = require('moment')
const { Client } = require('@elastic/elasticsearch')
const es_host = process.env.WATCHMEN_ES_HOST || '127.0.0.1'
const es_port = process.env.WATCHMEN_ES_PORT  || '9200'
const es_url = `http://${es_host}:${es_port}`
const es_index = process.env.WATCHMEN_ES_INDEX || 'watchmen'
const es_event_index = process.env.WATCHMEN_ES_EVENT_INDEX || "watchevent"
const client = new Client({ node: es_url })
const doSendEvent = ((process.env.WATCHMEN_ES_SEND_EVENT || "false") == "true")

/**
 * Filter service name before sending
 * @param {String} name
 */
function filterName (name) {
  return name.replace(/http(s)?|:|\/\//g, '').replace(/\/|\./g, '_');
}

/**
 * Send data to Graphite
 * @param {Object} service
 * @param {String} metric
 * @param value
 */
async function sendData (service, metric, value) {
  output = {
    index: es_index,
    // type: '_doc', // uncomment this line if you are using Elasticsearch ≤ 6
    body: {
      serviceName: service.name,
      service: service,
      metric: metric,
      value: value,
      timestamp: moment().toDate()
    }
  }

  if (metric != "serviceOk"){

    try{
      await client.index( output )
      // console.log("Sent to Elastic Search -> %output",output)
    }
    catch (e)
    {
      console.log(e)
    }
  }

}

/**
 * Send Graphite event
 * @param {Object} service
 * @param {Object} body
 */
async function sendEvent (service, body) {
  var serviceName = filterName(service.name);
  var tags = body.tags.split(' ');

  body.tags = 'watchmen ' + serviceName;
  tags.forEach(function (tag) {
    body.tags += ' ' + tag + ' ' + serviceName + '_' + tag;
  });
  await client.index({
    index: es_event_index,
    // type: '_doc', // uncomment this line if you are using Elasticsearch ≤ 6
    body: {
      service: serviceName,
      body: body
    }
  })
}

/**
 * Watchmen event handlers
 */
var eventHandlers = {

  onFailedCheck: function (service, data) {
    // Send failed check indication
    sendData(service, 'failedCheck', 1);

    if (doSendEvent) {
      sendEvent(service, {
        what: 'FAILED CHECK',
        tags: 'failed',
        when: Math.round(new Date().getTime() / 1000),
        data: 'Service: ' + service.name + ' (' + service.url + '). ' +
        'Type: ' + service.pingServiceName + '. ' +
        'Error: ' + JSON.stringify(data.error)
      });
    }
  },

  onLatencyWarning: function (service, data) {
    // Send latency warning indication with elapsed time
    if (service)
    sendData(service, 'latencyWarning', data.elapsedTime);

    if (doSendEvent) {
      sendEvent(service, {
        what: 'LATENCY WARNING',
        tags: 'latency',
        when: Math.round(new Date().getTime() / 1000),
        data: 'Service: ' + service.name + ' (' + service.url + '). ' +
        'Type: ' + service.pingServiceName + '. ' +
        'Default: ' + service.warningThreshold + ' ms. ' +
        'Current: ' + data.elapsedTime + ' ms.'
      });
    }
  },

  onServiceOk: function (service, data) {
    // Send success check load time
    // sendData(service, 'serviceOk', data.elapsedTime);
  },

  onNewOutage: function (service, outage) {
    // Send new outage indication
    sendData(service, 'newOutage', 1);

    if (doSendEvent) {
      sendEvent(service, {
        what: 'NEW OUTAGE',
        tags: 'outage',
        when: Math.round(outage.timestamp / 1000),
        data: 'Service: ' + service.name + ' (' + service.url + '). ' +
        'Type: ' + service.pingServiceName + '. ' +
        'Error: ' + JSON.stringify(outage.error)
      });
    }
  },

  onServiceBack: function (service, lastOutage) {
    // Send downtime duration in ms. (from latest outage)
    sendData(service, 'serviceBack', new Date().getTime() - lastOutage.timestamp);

    if (doSendEvent) {
      var duration = Math.round((new Date().getTime() - lastOutage.timestamp) / 1000);
      sendEvent(service, {
        what: 'RECOVERY',
        tags: 'recovery',
        when: Math.round(new Date().getTime() / 1000),
        data: 'Service: ' + service.name + ' (' + service.url + '). ' +
        'Type: ' + service.pingServiceName + '. ' +
        'Error: ' + JSON.stringify(lastOutage.error) + '. ' +
        'Duration: ' + (duration / 60).toFixed(2) + ' min.'
      });
    }
  },
};

function ESPlugIn (watchmen) {
  watchmen.on('service-error', eventHandlers.onFailedCheck);
  watchmen.on('service-ok', eventHandlers.onServiceOk);
  watchmen.on('service-back', eventHandlers.onServiceBack);
  watchmen.on('new-outage', eventHandlers.onNewOutage);
  watchmen.on('latency-warning', eventHandlers.onLatencyWarning);
}

exports = module.exports = ESPlugIn;