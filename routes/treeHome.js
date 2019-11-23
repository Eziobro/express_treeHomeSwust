const express = require('express');
const router = express.Router();
const moment = require('moment');
const {matchedData, header, body, query} = require('express-validator');
const mysql = require('../utils/database/connectMysql');
const {validate, checkToken, dataDeal} = require('../utils/utils');

/**
 * @function 获取说说 /mood/list
 * @require {
 *     tagid
 * }
 * @field {
 *     token
 *     context
 *     pagination
 *     flag 0:显示所有 1:只显示个人
 * }
 */
router.post('/list',
    validate([
        header('token').optional().custom(checkToken),
        body('tagid').isInt({min: 0}),
        body('context').trim().optional({checkFalsy: true}).escape(),
        body('pagination').customSanitizer((value, {req}) => {
            return req.body.pagination = value ? value : {pageSize: 10, currentPage: 1}
        }),
        body('flag').customSanitizer((value, {req}) => {
            return req.body.flag = 0
        }).isInt({min: 0})
    ]),
    async function (req, res) {
        const {openid} = req.body;
        const requiredData = await matchedData(req, {locations: ['body'], includeOptionals: false});
        const {pagination, flag, ...param} = requiredData;
        let sql;
        if (flag) {
            param.openid = openid;
        }

        sql = 'select remarkid,context,imgurl,publishdate,tagid,topic,nickName,gender,language,city,province,country,avatarUrl,IFNULL( star, 0 ) AS star,IFNULL( `comment`, 0 ) as comment,IFNULL(id,0) as flag from (((select * from remark natural left join qq_user) as remark NATURAL LEFT JOIN (select remarkid,ifnull(count(*),0) as star from star group by remarkid) as star) NATURAL LEFT JOIN (select remarkid,ifnull(count(*),0) as comment from comment group by remarkid) as comment) NATURAL LEFT JOIN star'

        const db_remark = await mysql('test', 'remark');
        const data = await db_remark.sql(sql, {
            ...param,
            pagination,
        }, 'order by publishDate desc');
        const total = await db_remark.sql(`select count(*) as total from remark`, {...param});
        await db_remark.close();
        res.send(dataDeal(200, {
            list: data,
            pagination: {...pagination, total: total[0].total}
        }))
    }
);

/**
 * @function 获取说说详情 /mood/remarkDetail
 * @requires {
 *     remarkid
 * }
 * @field {
 *     token
 * }
 */
router.get('/remarkDetail',
    validate([
        header('token').optional().custom(checkToken),
        query('remarkid').exists().isInt()
    ]),
    async function (req, res) {
        const {openid} = req.body;
        const requiredData = await matchedData(req, {locations: ['query'], includeOptionals: false});
        const params = {openid, ...requiredData};
        const {pagination = undefined, ...param} = params;
        const db = await mysql('test', 'remark');
        const data = await db.sql('select remarkid,context,imgurl,publishdate,tagid,topic,nickName,gender,avatarUrl,registdate from remark natural join qq_user', {remarkid: params.remarkid});
        await db.close();
        if (!data) {
            res.send(dataDeal(204));
            return;
        }
        res.send(dataDeal(200, {...data[0]}))
    }
);

/**
 * @function 发布说说 /mood/remark
 * @requires {
 *     tagid
 *     context
 *     token
 * }
 * @params {
 *     imgurl
 *     topic
 * }
 */
router.post('/remark',
    validate([
        header('token').exists().custom(checkToken),
        body('tagid').exists().isInt({min: 0}),
        body('context').trim().exists().not().isEmpty().isString().escape(),
        body('imgurl').optional(),
        body('topic').customSanitizer((value, {req}) => {
            return req.body.topic = value || 0;
        }).isInt({min: 0}),
    ]),
    async function (req, res) {
        const {openid} = req.body;
        const requiredData = await matchedData(req, {locations: ['body'], includeOptionals: false});
        const params = {openid, ...requiredData};
        const db_remark = await mysql('test', 'remark');
        console.log('params', {
            ...params,
            publishDate: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
        })
        const data = await db_remark.add({
            ...params,
            publishDate: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
        });
        await db_remark.close()
        if (!data) {
            res.send(dataDeal(204));
            return;
        }
        res.send(dataDeal(200, {list: {data}}))
    }
);

/**
 * @function 点赞 /mood/star
 * @requires {
 *     token
 *     remarkid
 * }
 */
router.post('/star',
    validate([
        header('token').exists().custom(checkToken),
        body('remarkid').exists().isInt({min: 0})
    ]),
    async function (req, res) {
        const {openid} = req.body;
        const requiredData = await matchedData(req, {locations: ['body'], includeOptionals: false});
        const params = {openid, ...requiredData};
        const db_remark = await mysql('test', 'star');
        await db_remark.add(params);
        await db_remark.close();
        res.send(dataDeal(200))
    }
);

/**
 * @function 取消点赞 /mood/unstar
 * @requires {
 *     token
 *     remarkid
 * }
 */
router.post('/unstar',
    validate([
        header('token').exists().custom(checkToken),
        body('remarkid').exists().isInt({min: 0})
    ]),
    async function (req, res) {
        const {openid} = req.body;
        const requiredData = await matchedData(req, {locations: ['body'], includeOptionals: false});
        const params = {openid, ...requiredData};
        const db_star = await mysql('test', 'star');
        await db_star.delete({remarkid: params.remarkid});
        await db_star.close();
        res.send(dataDeal(200))
    }
);

/**
 * @function 发布评论 /mood/publishcomment
 * @requires {
 *     token
 *     remarkid
 *     comment
 * }
 */
router.post('/publishcomment',
    validate([
        header('token').exists().custom(checkToken),
        body('remarkid').exists().isInt({min: 0}),
        body('comment').exists().trim().not().isEmpty().isString().escape(),
    ]),
    async function (req, res) {
        const {openid} = req.body;
        const requiredData = await matchedData(req, {locations: ['body'], includeOptionals: false});
        const params = {openid, ...requiredData};
        const db = await mysql('test', 'comment');
        await db.add(params);
        res.send({
            code: 200,
            data: {
                list: 'success'
            }
        })
    }
);

/**
 * @function 获取评论 /mood/getComment
 * @requires {
 *     token
 *     remarkid
 * }
 * @param {
 *     pagination
 * }
 */
router.post('/getComment',
    validate([
        header('token').exists().custom(checkToken),
        body('remarkid').exists().isInt({min: 0}),
        body('pagination').customSanitizer((value, {req}) => {
            return req.body.pagination = value ? value : {pageSize: 10, currentPage: 1}
        }),
    ]),
    async function (req, res) {
        const {openid} = req.body;
        const requiredData = await matchedData(req, {locations: ['body'], includeOptionals: false});
        const params = {openid, ...requiredData};
        const {pagination, ...param} = requiredData;
        const db = await mysql('test', 'comment');
        const data = await db.sql(`select id,remarkid,comment,nickName,avatarUrl,registdate from comment natural join qq_user`, requiredData, 'order by id desc');
        const total = await db.sql(`select count(*) as total from comment natural join qq_user`, param);
        res.send(dataDeal(200, {list: data, pagination: {...params.pagination, total: total[0].total}}))
    }
);

module.exports = router;
