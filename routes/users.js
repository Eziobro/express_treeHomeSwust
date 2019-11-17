const express = require('express');
const router = express.Router();
const axios = require('axios');
const {BASECONFIG} = require('../utils/Enum');
const mysql = require('../utils/database/connectMysql');
const {uploadFile, signToken, verifyToken, decodeToken, cipherivDecrypt, _decryptData, dataDeal, isGetRequire} = require('../utils/utils');

/**
 * @function 登录获取token /user/login
 * @requires code 前端登录时获取的code
 * @return token 签名
 */
router.post('/login', async function (req, res, next) {
    const {code} = req.body;
    if (!code) {
        res.send(dataDeal(201))
        return
    }
    const {data: {errcode, errmsg, openid, session_key}} = await axios({
        method: 'get',
        url: `https://api.q.qq.com/sns/jscode2session?appid=${BASECONFIG.APPID}&secret=${BASECONFIG.SECRET}&js_code=${code}&grant_type=${BASECONFIG.GRANT_TYPE}`,
    });
    const token = signToken(openid, openid);
    const db = await mysql('TreeHome', 'authority');
    await db.add({openid, session_key});
    await db.close();
    if (errcode !== 0) {
        res.send({
            code: errcode,
            data: errmsg,
        });
        return
    }
    res.send(dataDeal(200, token));
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
    const {encryptedData, iv, ...userData} = req.body;
    const token = req.get('token');
    const db_authority = await mysql('TreeHome', 'authority');
    const verify_openid = await decodeToken(token);
    const dbData = await db_authority.find({openid: verify_openid});
    await db_authority.close();
    if (dbData.length === 0) {
        res.send(dataDeal(202))
        return
    }
    const db_qq_user = await mysql('TreeHome', 'qq_user');
    delete userData.unionId;
    await db_qq_user.add({...userData, openid: verify_openid});
    await db_qq_user.close();
    res.send(dataDeal(200))
});

/**
 * @function 获取当前登录用户的信息 /user/getCurrentUser
 * @requires token 签名
 */
router.get('/getCurrentUser', async function (req, res, next) {
    const token = req.get('token');
    const db_authority = await mysql('TreeHome', 'authority');
    const verify_openid = await decodeToken(token);
    const dbData = await db_authority.find({openid: verify_openid});
    await db_authority.close();
    if (dbData.length === 0) {
        res.send(dataDeal(202))
        return;
    }
    const db_qq_user = await mysql('TreeHome', 'qq_user');
    const userData = db_qq_user.find({verify_openid});
    await db_qq_user.close()
    delete userData.openid;
    res.send(dataDeal(200,userData))

});

module.exports = router;
