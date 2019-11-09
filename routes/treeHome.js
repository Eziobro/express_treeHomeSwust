var express = require('express');
var router = express.Router();
const mysql = require('../utils/database/connectMysql');
const {MOOD} = require('../utils/Enum')

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
    const data = await db.sql('select * from remark inner join user on remark.userId = user.id',{moodId});
    res.send({
        code: 200,
        data:{
            list:data
        }
    })
});

module.exports = router;
