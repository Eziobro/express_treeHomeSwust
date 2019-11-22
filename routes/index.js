const express = require('express');
const router = express.Router();
const {check, validationResult, matchedData, header} = require('express-validator');
const {validate, checkToken} = require('../utils/utils');

router.get('/index', validate([
    header('token').exists({checkNull: true}).custom(checkToken)
]), function (req, res, next) {
    const bodyData = matchedData(req, {locations: ['body', 'header', 'query']});
    console.log(bodyData)
    res.send('router');
});

/* GET home page. */
router.get('/', function (req, res, next) {
    res.send('router');
});

router.use(function (req, res, next) {
    console.log('%s %s %s', req.method, req.url, req.path);
    next();
});

// app.use('/index', router)

module.exports = router;
