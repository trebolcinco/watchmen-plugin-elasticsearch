#!/bin/bash
curl -X DELETE http://localhost:9200/watchmen*
curl -X PUT -H "Content-Type: application/json" -d @watchmen-policy.json 'http://localhost:9200/_ilm/policy/watchmen_policy'
curl -X PUT -H "Content-Type: application/json" -d @watchmen-template.json 'http://localhost:9200/_template/watchmen_template'
curl -X PUT -H "Content-Type: application/json" -d @watchmen-mapping.json 'http://localhost:9200/watchmen/'
curl -X GET http://localhost:9200/watchmen
