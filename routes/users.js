const express = require('express');
const router = express.Router();
const axios = require('axios');
const {BASECONFIG} = require('../utils/Enum');
const {cipherivDecrypt} = require('../utils/utils');
const mysql = require('../utils/database/connectMysql');


/* GET users listing. */
router.post('/login', async function (req, res, next) {
    const {code} = req.body;
    const response = await axios({
        method: 'get',
        url: `https://api.q.qq.com/sns/jscode2session?appid=${BASECONFIG.APPID}&secret=${BASECONFIG.SECRET}&js_code=${code}&grant_type=${BASECONFIG.GRANT_TYPE}`,
    });

    const {data: {errcode, errmsg, openid, session_key}} = response;
    const db = await mysql('test', 'authority');
    await db.update({openid}, {session_key});
    if (errcode !== 0) {
        res.send({
            code: errcode,
            data: errmsg,
        });
        return
    }
    res.send({
        code: 200,
        data: {
            token: openid,
        }
    });
});

router.post('/saveuser', async function (req, res, next) {
    const {data, userInfo, signature, encryptedData, iv, openid} = req.body;
    const db = await mysql('test', 'authority');
    const dbData = await db.find({openid});
    const session_key = dbData[0].session_key;
    const {openId, watermark: {appid, timestamp}, ...rest} = cipherivDecrypt(encryptedData, session_key, iv);
    res.send({msg});
});

module.exports = router;
