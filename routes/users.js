const express = require('express');
const router = express.Router();
const axios = require('axios');
const {BASECONFIG} = require('../utils/Enum');
const mysql = require('../utils/database/connectMysql');
const {uploadFile, signToken, verifyToken, decodeToken, cipherivDecrypt} = require('../utils/utils');

/**
 * @function 登录获取token /user/login
 * @requires code 前端登录时获取的code
 * @return token 签名
 */
router.post('/login', async function (req, res, next) {
    const {code} = req.body;
    const response = await axios({
        method: 'get',
        url: `https://api.q.qq.com/sns/jscode2session?appid=${BASECONFIG.APPID}&secret=${BASECONFIG.SECRET}&js_code=${code}&grant_type=${BASECONFIG.GRANT_TYPE}`,
    });

    const {data: {errcode, errmsg, openid, session_key}} = response;
    const db = await mysql('test', 'authority');
    await db.add({openid, session_key});
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
            token: signToken(openid, openid)
        }
    });
});

/**
 * @function 在数据库中保存用户 /user/saveuser
 * @requires {
 *     encryptedData 获取用户信息的加密数据
 *     iv 偏移向量
 *     token 签名
 * }
 */
router.post('/saveuser', async function (req, res, next) {
    const {encryptedData, iv} = req.body;
    const token = req.get('token')
    const db = await mysql('test', 'authority');
    const verify_openid = await decodeToken(token);
    const dbData = await db.find({openid: verify_openid});
    await db.close();
    if (dbData.length === 0) {
        res.send({
            code: 401,
            data: '用户身份未知'
        })
        return
    }
    const session_key = dbData[0].session_key;
    const {openId, watermark: {appid, timestamp}, ...userData} = cipherivDecrypt(encryptedData, session_key, iv);
    if (openId == verify_openid) {
        const db = await mysql('test', 'qq_user');
        delete userData.unionId;
        db.add({...userData, openid: openId});
        res.send({
            code: 200,
            data: '成功加入用户'
        })
    } else {
        res.send({
            code: 401,
            data: '用户身份未知'
        })
    }
});

/**
 * @function 获取当前登录用户的信息 /user/getCurrentUser
 * @requires token 签名
 */
router.get('/getCurrentUser', async function (req, res, next) {
    const token = req.get('token');
    const db_authority = await mysql('test', 'authority');
    const verify_openid = await decodeToken(token);
    const dbData = await db_authority.find({openid: verify_openid});
    await db_authority.close();
    if (dbData.length === 0) {
        res.send({
            code: 401,
            data: '用户身份未知'
        })
        return;
    }
    const db_qq_user = await mysql('test', 'qq_user');
    const userData = db_qq_user.find({verify_openid});
    delete userData.openid
    res.send({
        code: 200,
        data: userData
    })

});

module.exports = router;
