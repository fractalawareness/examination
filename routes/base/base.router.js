//const responses = require('../../constants/responses');
const endpoints = require('../../constants/endpoints');
const needle = require('needle');
const cheerio = require('cheerio');
const urlBase = require('url');
const parserURL = require('url').URL;
let   redis = require('redis'),
    client = redis.createClient();

class RouterProvider {
    constructor(modelName, router) {
        this._modelName = modelName;
        this.router = router;
        this.router.get(endpoints.rootEndpoint, this.start.bind(this));
        this.router.get(endpoints.getSearch, this.list.bind(this));
        this.router.get(endpoints.getSearchList, this.show.bind(this));
        this.router.delete(endpoints.getSearch, this.remove.bind(this));
    }
    start(req, res){
        res.json('Please use the search - for example - /api/search/?url=https%3A%2F%2Fgoogle.com&element=h2');
    }

    list(req, res) {
        const reqData = req.query;
        const stringURL = reqData.url;
        const stringElement = reqData.element;
        const urlDomain = urlBase.parse(stringURL); 
        const myHostname = new parserURL(stringURL);
        const siteKey = req._parsedUrl.search;
        let PageLinks = [];
        function onErrorCallback(err) {
                console.log(err);
        }
        function pageScrape (pageUrl, tag) {
            return new Promise(function (resolve, reject) {
                needle.get(pageUrl, function(err, res){
                    if (!err){
                        const $ = cheerio.load(res.body);
                        let filteredData = $(tag).map(function() {
                            return $(this).html();
                        }).get();
                        resolve(filteredData);
                    } else {
                        reject(err);
                    }
                });
            });
        }
        function findLinks () {
            return new Promise(function (resolve, reject) {
                needle.get(stringURL, function(err, res){
                    //console.log(res);
                    if (!err){
                        const $ = cheerio.load(res.body);
                        
                        $('a').each(function(i) {
                            if ((urlBase.parse($(this).attr('href')).hostname == myHostname.hostname)||($(this).attr('href').charAt(0)=='/')){
                                if(($(this).attr('href').charAt(0)=='/')){
                                    PageLinks[i] = `${urlDomain.protocol}//${urlDomain.hostname}${$(this).attr('href')}`;
                                } else {
                                    PageLinks[i] = $(this).attr('href');
                                }       
                            }
                        });
                        for (var i = PageLinks.length; i >= 0; i--) {
                            if (!PageLinks[i]) PageLinks.splice(i, 1);
                        }
                      //  console.log(PageLinks);
                        resolve(PageLinks);
                    } else {
                        reject(err);
                    }
                }); 
            });
        }
        function saveToRedis (key, data, onError, onSuccess){
            //client.on('error', onError);
            client.set(key, data, function (err, repl) {
                if (err) {
                    console.log(err);
                    client.quit();
                }
                else {
                    client.expireat(key, parseInt((+new Date)/1000) + 86400);
                    console.log(repl);
                    onSuccess(repl);
                }
            });
        }

        function readFromRedis(key, onError, onSuccess){
            //client.on('error', onErrorCallback);
            client.get(key, function (err, repl) {
                client.quit();
                if (err) {
                    onError(err);
                    client.quit();
                } else if (repl) {
                    onSuccess(repl);
                } else {
                    onError('The key was not found.');
                }
            });
        }

        findLinks()
        .then((result) => {
            console.log(result);
            let links = result.map(function(elem) {
                return pageScrape (elem, stringElement);
            });
            return Promise.all(links);
        })
        .then((result) => {  
            const jsonData = JSON.stringify(result);
            return new Promise(function(resolve, reject) {
                saveToRedis(siteKey,jsonData, onErrorCallback, resolve);
            });
        })
        .then(() => {
            console.log('saveToRedis is complete');
            return new Promise((resolve, reject) => {
                readFromRedis(siteKey, onErrorCallback, resolve);
            });
            
        })
        .then((result) => {
            res.json(result);
        })
        .catch(function (error) { 
            console.log(error);
            res.json('Having trouble - try again');
            return;
        });
    }
    show(req, res) {
        function readAllFromRedis(){
            return new Promise(function (resolve, reject) {
                client.keys('*', function (err, keys) {
                    if (!err){ 
                        let links = keys.map(function(elem) {    
                            return  {
                                 "url": urlBase.parse(elem.replace('?url=', '')).hostname,
                                 "element": urlBase.parse(elem.replace('?url=', '')).path
                            };
                        });
                        resolve(links);
                    } else {
                        reject(err);
                    }
                }); 
            });      
        }
         
        readAllFromRedis()
        .then((result) => {
            console.log(result);
            res.json(result);
        })
        .catch(function (error) {
            console.log(error);
            res.json('Having trouble - try again');
            return;
        });
    }


    remove(req, res) {
        const siteKey = req._parsedUrl.search;

        function deleteItemFromRedis(){
            return new Promise(function (resolve, reject) {
                client.del(siteKey, function (err, reply) {
                    if (!err){ 
                        resolve(reply);
                    } else {
                        reject(err);
                    }
                }); 
            });      
        }
        deleteItemFromRedis()
        .then((result) => {
            console.log(siteKey);
            res.json(siteKey +' - DELETED');
        })
        .catch(function (error) {
            console.log(error);
            res.json('Having trouble - try again');
            return;
        });        
    }
}

module.exports = RouterProvider;
