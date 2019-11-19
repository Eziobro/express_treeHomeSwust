var express = require('express');
var router = express.Router();
const mysql = require('../utils/database/connectMysql');
const {MOOD} = require('../utils/Enum');
const moment = require('moment');
const {uploadFile, signToken, verifyToken, decodeToken, cipherivDecrypt, dataDeal, isGetRequire} = require('../utils/utils');

/**
 * @function 获取说说 /mood/list
 * @requires moodId 心情id
 */
router.post('/list', async function (req, res, next) {
    const {pagination = {pageSize: 10, currentPage: 1}, flag = 0, tabid = 0, moodid = 0, ...params} = req.body;
    const token = req.get('token');
    let verify_openid;
    if (flag) {
        verify_openid = decodeToken(token);
        const db_authority = await mysql('TreeHome', 'authority');
        const dbData = await db_authority.find({openid: verify_openid});
        await db_authority.close();
        if (dbData.length === 0) {
            res.send(dataDeal(202));
            return;
        }
        params.openid = verify_openid;
    }

    // const exist = MOOD.some((value) => value.moodId == params.moodid);
    // if (!exist) {
    //     res.send(dataDeal(201));
    //     return;
    // }
    const db_remark = await mysql('TreeHome', 'remark');
    if (moodid != 0) {
        params.moodid = moodid;
    }
    const data = await db_remark.sql('select * from qq_user natural right join (select * from remark natural left join (select remarkid,count(*) as comment from comment group by remarkid) as comment) as remark', params, pagination, 'order by publishDate desc');
    const total = await db_remark.sql(`select count(*) as total from qq_user natural right join (select * from remark natural left join (select remarkid,count(*) as comment from comment group by remarkid) as comment) as remark`, {...params}, "", 'order by publishDate desc');
    await db_remark.close();
    pagination.total = total ? total[0].total : 0;
    res.send(dataDeal(200, {
        list: Array.from(data || []),
        pagination,
    }))
});

/**
 * @function 获取说说详情 /mood/remarkDetail
 * @requires id 说说id
 */
router.get('/remarkDetail', async function (req, res, next) {
    const {id} = req.query;
    const db = await mysql('TreeHome', 'remark');
    const data = await db.sql('select * from remark natural join qq_user', {remarkid: id});
    await db.close();
    if (data == undefined) {
        res.send(dataDeal(204));
        return;
    }
    res.send(dataDeal(200, {...data[0]}))
});

/**
 * @function 发布说说 /mood/remark
 * @requires {
 *     moodId:心情id,
 *     context:说说正文
 * }
 * @params {
 *     imgUrl:正文图片地址
 * }
 */
router.post('/remark', async function (req, res, next) {
    const {moodId = 0, context, imgUrl} = req.body;
    const token = req.get('token');
    const verify_openid = await decodeToken(token);
    const db_authority = await mysql('TreeHome', 'authority');
    const dbData = await db_authority.find({openid: verify_openid});
    await db_authority.close();
    if (dbData.length === 0) {
        res.send(dataDeal(202));
        return;
    }
    const db_remark = await mysql('TreeHome', 'remark');
    const data = await db_remark.add({
        openid: verify_openid,
        context,
        moodid: moodId,
        img: imgUrl,
        star: 0,
        publishDate: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
    });
    await db_remark.close()
    if (!data) {
        res.send(dataDeal(204));
        return;
    }
    res.send(dataDeal(200, {list: {data}}))
});

/**
 * @function 点赞 /mood/star
 * @requires id 说说id
 */
router.post('/star', async function (req, res, next) {
    const {id} = req.body;
    if (!id) {
        res.send(dataDeal(201))
        return;
    }
    const token = req.get('token');
    const verify_openid = await decodeToken(token);
    const db_authority = await mysql('TreeHome', 'authority');
    const dbData = await db_authority.find({openid: verify_openid});
    await db_authority.close();
    if (dbData.length === 0) {
        res.send(dataDeal(202));
        return;
    }
    const db = await mysql('TreeHome', 'remark');
    const data = await db.sql('UPDATE remark SET star=star+1', {remarkid: id});
    res.send(dataDeal(200))
});

/**
 * @function 点赞 /mood/unstar
 * @requires id 说说id
 */
router.post('/unstar', async function (req, res, next) {
    const {id} = req.body;
    const token = req.get('token');
    if (!id) {
        res.send(dataDeal(201));
        return;
    }
    const verify_openid = await decodeToken(token);
    const db_authority = await mysql('TreeHome', 'authority');
    const dbData = await db_authority.find({openid: verify_openid});
    await db_authority.close();
    if (dbData.length === 0) {
        res.send(dataDeal(202));
        return;
    }
    const db = await mysql('TreeHome', 'remark');
    const data = await db.sql('UPDATE remark SET star=star-1', {remarkid: id});
    await db.close();
    res.send(dataDeal(200))
});

/**
 * @function 发布评论 /mood/publishComment
 * @requires {
 *     id:说说id
 *     comment:评论
 * }
 */
router.post('/publishcomment', async function (req, res, next) {
    const {remarkid, comment} = req.body;
    const exist = [remarkid, comment].some(item => item == "");
    if (exist) {
        res.send(dataDeal(201));
        return;
    }
    const token = req.get('token');
    const verify_openid = await decodeToken(token);
    const db_authority = await mysql('TreeHome', 'authority');
    const dbData = await db_authority.find({openid: verify_openid});
    await db_authority.close();
    if (dbData.length === 0) {
        res.send(dataDeal(202));
        return;
    }
    const db = await mysql('TreeHome', 'comment');
    await db.add({remarkid, comment, openid: verify_openid});
    res.send({
        code: 200,
        data: {
            list: 'success'
        }
    })
});

/**
 * @function 获取评论 /mood/getComment
 * @requires {
 *     id:说说id
 *     userId:用户id
 * }
 */
router.post('/getComment', async function (req, res, next) {
    const {remarkid, pagination = {pageSize: 10, currentPage: 1}, flag = 0} = req.body;
    const params = {
        remarkid
    }
    const token = req.get('token');
    let verify_openid;
    if (flag) {
        verify_openid = await decodeToken(token);
        const db_authority = await mysql('TreeHome', 'authority');
        const dbData = await db_authority.find({openid: verify_openid});
        await db_authority.close();
        if (dbData.length === 0) {
            res.send(dataDeal(202));
            return;
        }
        params.openid = verify_openid;
    }
    const exist = [remarkid].some(item => item == '');
    if (exist) {
        res.send(dataDeal(201));
        return;
    }

    const db = await mysql('TreeHome', 'comment');
    const data = await db.sql(`select * from comment natural join qq_user`, params, pagination, 'order by id desc');
    const total = await db.sql(`select count(*) as total from comment natural join qq_user`, {
        remarkid
    });
    pagination.total = total[0].total;
    res.send(dataDeal(200, {
        list: data,
        pagination
    }))
});

module.exports = router;
