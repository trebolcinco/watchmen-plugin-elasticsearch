#!/bin/bash
curl -X DELETE http://10.0.0.204:9200/watchmen*
curl -X PUT -H "Content-Type: application/json" -d @watchmen-policy.json 'http://10.0.0.204:9200/_ilm/policy/watchmen_policy'
curl -X PUT -H "Content-Type: application/json" -d @watchmen-template.json 'http://10.0.0.204:9200/_template/watchmen_template'
curl -X PUT -H "Content-Type: application/json" -d @watchmen-mapping.json 'http://10.0.0.204:9200/watchmen-00001/'
curl -X GET http://10.0.0.204:9200/watchmen
