const express = require('express');
const app = express();
const router = express.Router();
const moment = require('moment');
const axios = require('axios');
const {matchedData, header, body} = require('express-validator');
const {BASECONFIG} = require('../utils/Enum');
const mysql = require('../utils/database/connectMysql');
const {signToken, dataDeal,validate, checkToken} = require('../utils/utils');

/**
 * @function 登录获取token /user/login
 * @requires code 前端登录时获取的code
 * @return token 签名
 */
router.post('/login', validate([
        body('code').exists({checkNull: true})
    ]),
    async function (req, res, next) {
        const {code} = req.body;

        const {data: {errcode, errmsg, openid, session_key}} = await axios({
            method: 'get',
            url: `https://api.q.qq.com/sns/jscode2session?appid=${BASECONFIG.APPID}&secret=${BASECONFIG.SECRET}&js_code=${code}&grant_type=${BASECONFIG.GRANT_TYPE}`,
        });

        const token = signToken(openid, openid);
        const db = await mysql('test', 'authority');
        await db.replace({openid, session_key});
        await db.close();
        if (errcode !== 0) {
            res.status(errcode).send({
                code: errcode,
                data: errmsg,
            });
            return
        }
        res.status(200).send(dataDeal(200, token));
    }
);

/**
 * @function 在数据库中保存用户 /user/saveuser
 * @requires {
 *     encryptedData 获取用户信息的加密数据
 *     iv 偏移向量
 *     token 签名
 * }
 */
router.post('/saveuser', validate([
        header('token').exists({checkNull: true}).custom(checkToken),
        body('nickName').exists({checkNull: true}).isString().escape(),
        body('gender'),
        body('language'),
        body('city'),
        body('province'),
        body('avatarUrl').exists().isURL()
    ]),
    async function (req, res, next) {
        const {openid} = req.body;
        const requiredData = await matchedData(req, {locations: ['body'], includeOptionals: false});
        const params = {openid, ...requiredData};
        const db_qq_user = await mysql('test', 'qq_user');
        await db_qq_user.add({
            ...params,
            registdate: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
        });
        await db_qq_user.close();
        res.send(dataDeal(200));
    }
);

/**
 * @function 获取当前登录用户的信息 /user/getcurrentuser
 * @requires token 签名
 */
router.post('/getcurrentuser', validate([
        header('token').exists({checkNull: true}).custom(checkToken)
    ]),
    async function (req, res, next) {
        const {openid} = req.body;
        const db_qq_user = await mysql('test', 'qq_user');
        const userData = await db_qq_user.find({openid});
        await db_qq_user.close();
        delete userData.openid;
        if (userData.length === 0) {
            res.status(204).send(dataDeal(204))
            return
        }
        res.status(200).send(dataDeal(200, userData[0]))

    }
);

module.exports = router;
