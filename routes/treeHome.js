var express = require('express');
var router = express.Router();
const mysql = require('../utils/database/connectMysql');
const {MOOD} = require('../utils/Enum');
const moment = require('moment');

/**
 * @function 获取说说 /mood/list
 * @requires moodId 心情id
 */
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
    const data = await db.sql('select * from remark inner join user on remark.userId = user.userId', req.query);
    res.send({
        code: 200,
        data: {
            list: data
        }
    })
});

/**
 * @function 获取说说详情 /mood/remarkDetail
 * @requires id 说说id
 */
router.get('/remarkDetail', async function (req, res, next) {
    const {id} = req.query;
    const db = await mysql('TreeHome', 'remark');
    const data = await db.sql('select * from remark natural join user', req.query);
    if (data == undefined) {
        res.send({
            code: 201,
            data: '参数错误'
        });
        return;
    }
    res.send({
        code: 200,
        data: {
            ...data[0]
        }
    })
});

/**
 * @function 发布说说 /mood/remark
 * @requires {
 *     moodId:心情id,
 *     context:说说正文
 *     userId:用户id
 * }
 * @params {
 *     img:正文图片
 * }
 */
router.post('/remark', async function (req, res, next) {
    const {moodId, context, userId, img} = req.body;
    const exist = MOOD.some((value) => value.moodId == moodId);
    if (!exist) {
        res.send({
            code: 201,
            data: '不存在该用户'
        });
        return;
    }
    const db = await mysql('TreeHome', 'remark');
    const data = await db.add({
        ...req.body,
        star: 0,
        comment: 0,
        publishDate: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
    });
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

/**
 * @function 点赞 /mood/star
 * @requires id 说说id
 */
router.post('/star', async function (req, res, next) {
    const {id} = req.body;
    if (!id) {
        res.send({
            code: 201,
            data: '参数错误'
        });
        return;
    }
    const db = await mysql('TreeHome', 'remark');
    const data = await db.sql('UPDATE remark SET star=star+1', {id});
    res.send({
        code: 200,
        data: {
            list: data
        }
    })
});

/**
 * @function 点赞 /mood/unstar
 * @requires id 说说id
 */
router.post('/unstar', async function (req, res, next) {
    const {id} = req.body;
    if (!id) {
        res.send({
            code: 201,
            data: '参数错误'
        });
        return;
    }
    const db = await mysql('TreeHome', 'remark');
    const data = await db.sql('UPDATE remark SET star=star-1', {id});
    res.send({
        code: 200,
        data: {
            list: data
        }
    })
});

/**
 * @function 发布评论 /mood/publishComment
 * @requires {
 *     id:说说id
 *     userId:用户id,
 *     comment:评论
 * }
 */
router.post('/publishComment', async function (req, res, next) {
    const {id, userId, comment} = req.body;
    const exist = [id, userId, comment].some(item => item == "");
    if (exist) {
        res.send({
            code: 201,
            data: '参数错误'
        });
        return;
    }
    const db = await mysql('TreeHome', 'comment');
    await db.add({remarkId: id, userId, comment});
    await db.sql('UPDATE remark SET comment=comment+1', {id});
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
router.get('/getComment', async function (req, res, next) {
    const {id, userId} = req.query;
    console.log('req.query', req.query)
    const exist = [id, userId].some(item => item == '');
    if (exist) {
        res.send({
            code: 201,
            data: '参数错误'
        });
        return;
    }
    const db = await mysql('TreeHome', 'comment');
    const data = await db.sql(`select * from comment natural join user`, {
        userId: userId,
        remarkId: id
    });
    console.log('data',data)
    res.send({
        code: 200,
        data: {
            list: data
        }
    })
});

module.exports = router;
