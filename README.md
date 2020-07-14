# Delivers Watchmen failures to Elastic Search.

### Watchmen variables that need to be set:

*Elastic Search Variables*
* WATCHMEN_ES_HOST=9200      (default)
* WATCHMEN_ES_PORT=127.0.0.1 (default)
* WATCHMEN_ES_INDEX=watchmen (default)

*Elastic Search Setup*
Run watchmen-setup-es.sh to setup the indexes and policies
See: https://github.com/iloire/watchmen for information about how to build a watchmen plugin