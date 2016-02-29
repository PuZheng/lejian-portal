# lejian-portal

## SETUP DEVELOPMENT ENVIRONMENT
    
```
$ npm install
$ gulp # livereload will start automatically
```
then start your development.


## DEPLOY

### Prequisite

* setup qiniu command line tools, put them in your "PATH" environment variable
* edit "qiniu-conf.json" file, you could refer to "qiniu-conf.sample.json"
    
```
$ gulp sync
$ gulp refresh
```
