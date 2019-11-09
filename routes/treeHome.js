var express = require('express');
var router = express.Router();
const mysql = require('../utils/database/connectMysql');
const {MOOD} = require('../utils/Enum');
const moment = require('moment')

/* GET home page. */
router.get('/list', async function (req, res, next) {
    const {moodId} = req.query;
    const exist = MOOD.some((value) => value.moodId == moodId);
    if (!exist) {
        res.send({
            code: 201,
            data: '参数错误'
        });
        return;
    }
    const db = await mysql('TreeHome', 'remark');
    const data = await db.sql('select * from remark inner join user on remark.userId = user.id', {moodId});
    res.send({
        code: 200,
        data: {
            list: data
        }
    })
});

router.post('/comment', async function (req, res, next) {
    const {moodId, context, userId, img} = req.body;
    console.log(req.body);
    const exist = MOOD.some((value) => value.moodId == moodId);
    if (!exist) {
        res.send({
            code: 201,
            data: '不存在该用户'
        });
        return;
    }
    const db = await mysql('TreeHome', 'remark');
    const data = await db.add({...req.body, star: 0, comment: 0,publishDate:moment(new Date()).format('YYYY-MM-DD HH:mm:ss')});
    if (!data) {
        res.send({
            code: 201,
            data: '参数错误'
        });
        return;
    }
    res.send({
        code: 200,
        data: {
            list: data
        }
    })
});

module.exports = router;
