const Crypto = require('cryptojs/cryptojs.js').Crypto;
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {validationResult} = require('express-validator');
const mysql = require('../utils/database/connectMysql');
const {COS, NETSTATUS} = require('../utils/Enum');

/**
 * 深拷贝
 * @param obj
 * @returns {[]|*}
 */
module.exports = function deepCopy(obj) {
    const isArray = obj instanceof Array;
    const isObject = obj instanceof Object;
    if (!isObject) return obj;
    const n = (isArray ? [] : {});
    for (const k in obj) n[k] = deepCopy(obj[k]);
    return n;
};

/**
 * 防抖函数
 * @param func 回调函数
 * @param wait 间隔时间
 * @param immediate 是否立即执行
 * @returns {function(): *}
 */
module.exports = function debounce(func, wait, immediate) {
    let timeout, result;
    const debounced = function () {
        const context = this;
        const args = arguments;

        if (timeout) clearTimeout(timeout);
        if (immediate) {
            // 如果已经执行过，不再执行
            const callNow = !timeout;
            timeout = setTimeout(function () {
                timeout = null;
            }, wait);
            if (callNow) result = func.apply(context, args)
        } else {
            timeout = setTimeout(function () {
                func.apply(context, args)
            }, wait);
        }
        return result;
    };

    // 不用等待，直接执行回调
    debounced.cancel = function () {
        clearTimeout(timeout);
        timeout = null;
    };

    return debounced;
};

/**
 * 日期间隔计算
 * @param earlierDate 较早的日期
 * @param Date 较晚的日期
 * @returns {string|{hour: number, year: number, day: number, minute: number, second: number}}
 */
module.exports = function dateCalculate(earlierDate, Date) {
    if (type(earlierDate) !== 'date' && type(Date) !== 'date') {
        console.log("参数格式错误");
        return 'xxxx-xx-xx';
    }
    const interval = Date - earlierDate;
    return {
        year: Math.floor(interval / (365 * 24 * 60 * 60 * 1000)),
        day: Math.floor(interval / (24 * 60 * 60 * 1000)),
        hour: Math.floor(interval / (60 * 60 * 1000)),
        minute: Math.floor(interval / (60 * 1000)),
        second: Math.floor(interval / (1000)),
    }
};

/**
 * 判断对象类型
 * @param obj 需要判断的对象
 * @returns {string|*}
 */
module.exports = function type(obj) {
    const class2type = {};
    "Boolean Number String Function Array Date RegExp Object Error".split(" ").map(function (item, index) {
        class2type["[object " + item + "]"] = item.toLowerCase();
    });
    if (obj == null) {
        return obj + "";
    }
    return typeof obj === "object" || typeof obj === "function" ?
        class2type[Object.prototype.toString.call(obj)] || "object" :
        typeof obj;
};

/**
 * 时间处理格式化
 * @param time
 * @param fmt
 * @returns {void | string}
 */
module.exports.timeFormat = function (time, fmt) {
    const o = {
        "M+": time.getMonth() + 1, //月份
        "d+": time.getDate(), //日
        "h+": time.getHours(), //小时
        "m+": time.getMinutes(), //分
        "s+": time.getSeconds(), //秒
        "q+": Math.floor((time.getMonth() + 3) / 3), //季度
        "S": time.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (time.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (const k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};

/**
 * 数组去重
 * @param array
 * @returns {*}
 */
module.exports.unique = function (array) {
    const obj = {};
    return array.filter(function (item, index, array) {
        return obj.hasOwnProperty(typeof item + JSON.stringify(item)) ? false : (obj[typeof item + JSON
            .stringify(item)] = true)
    })
};

/**
 * 对称解密
 * @param encryptedData
 * @param sessionKey
 * @param {*} iv 向量
 * @returns
 */
module.exports.cipherivDecrypt = function (encryptedData, sessionKey, iv) {
    // base64 decode ：使用 CryptoJS 中 Crypto.util.base64ToBytes()进行 base64解码
    const _encryptedData = Crypto.util.base64ToBytes(encryptedData);
    const key = Crypto.util.base64ToBytes(sessionKey);
    const _iv = Crypto.util.base64ToBytes(iv);

    // 对称解密使用的算法为 AES-128-CBC，数据采用PKCS#7填充
    const mode = new Crypto.mode.CBC(Crypto.pad.pkcs7);

    try {
        // 解密
        const bytes = Crypto.AES.decrypt(_encryptedData, key, {
            asBpytes: true,
            iv: _iv,
            mode: mode
        });

        return JSON.parse(bytes)
    } catch (err) {
        console.log(err)
    }
};

/**
 * 上传文件到存储桶中
 * @param rooter
 * @param filename
 * @param file
 * @param func
 */
module.exports.uploadFile = function (rooter, filename, file, func) {
    const cos = new COS({
        SecretId: COS.SECRETID,
        SecretKey: COS.SECRETKEY,
    });
    cos.putObject({
        Bucket: COS.BUCKET,
        Region: COS.REGION,
        Key: `${rooter}/${filename}`,
        Body: file,
    }, function (err, data) {
        if (err) {
            func(data);
            return;
        }
        func(data);
    });
};

/**
 * 从存储桶下载文件
 * @param rooter
 * @param filename
 * @param func
 */
module.exports.downloadFile = function (rooter, filename, func) {
    const cos = new COS({
        SecretId: COS.SECRETID,
        SecretKey: COS.SECRETKEY,
    });
    cos.getObject({
        Bucket: COS.BUCKET,
        Region: COS.REGION,
        Key: `${rooter}/${filename}`,
        Output: path.join(__dirname, '../public', `${rooter}/${filename}`)
    }, function (err, data) {
        if (err) {
            func(data);
            return;
        }
        func(data);
    });
};

/**
 * 从存储桶中删除文件
 * @param rooter
 * @param filename
 * @param func
 */
module.exports.deleteFile = function (rooter, filename, func) {
    const cos = new COS({
        SecretId: COS.SECRETID,
        SecretKey: COS.SECRETKEY,
    });
    cos.deleteObject({
        Bucket: COS.BUCKET,
        Region: COS.REGION,
        Key: `${rooter}/${filename}`,
    }, function (err, data) {
        if (err) {
            func(data);
            return;
        }
        func(data);
    });
};

/**
 *
 * @param rooter
 * @param filename
 * @param func
 */
module.exports.selectFile = function (rooter, filename, func) {
    const cos = new COS({
        SecretId: COS.SECRETID,
        SecretKey: COS.SECRETKEY,
    });
    cos.getBucket({
        Bucket: COS.BUCKET,
        Region: COS.REGION,
        Key: `${rooter}/${filename}`,
    }, function (err, data) {
        if (err) {
            func(data);
            return;
        }
        func(data);
    });
};

/**
 * 签名函数
 * @param data
 * @param privateKey
 * @param expiresIn
 * @param algorithm
 * @returns {undefined|*}
 */
module.exports.signToken = function (data, privateKey, expiresIn, algorithm) {
    const config = {};
    if (algorithm) {
        config.algorithm = algorithm
    }
    if (expiresIn) {
        config.expiresIn = expiresIn
    }
    return jwt.sign(data, privateKey, {...config})
};

/**
 * 验证token
 * @param token
 * @param privateKey
 * @param callback
 * @returns {*}
 */
module.exports.verifyToken = function (token, privateKey, callback) {
    let data;
    jwt.verify(token, privateKey, (error, decoded) => {
        data = error || decoded;
        callback(error, decoded);
    });
    return data;
};

/**
 * 对称解密
 * @param encryptedData
 * @param sessionKey
 * @param iv
 * @returns {*}
 * @private
 */
module.exports._decryptData = function (encryptedData, sessionKey, iv) {
    let decoded;

    // base64 decode
    const _sessionKey = Buffer.from(sessionKey, 'base64').toString('utf8');
    encryptedData = Buffer.from(encryptedData, 'base64').toString('utf8');
    iv = Buffer.from(iv, 'base64').toString('utf8');

    try {
        // 解密
        const decipher = crypto.createDecipheriv('aes-128-cbc', _sessionKey, iv);
        // 设置自动 padding 为 true，删除填充补位
        decipher.setAutoPadding(true);
        decoded = decipher.update(encryptedData, 'binary', 'utf8');
        decoded += decipher.final('utf8');

        decoded = JSON.parse(decoded);

    } catch (err) {
        console.log('err', err);
    }

    return decoded
};

/**
 * 解密签证
 * @param token
 * @returns {null|{payload, signature, header}}
 */
module.exports.decodeToken = function (token) {
    return jwt.decode(token);
};

/**
 * 根据code定义接口返回的数据
 * @param code
 * @param data
 * @returns {{code: *, data: (*)}}
 */
module.exports.dataDeal = function (code, data) {
    return {
        code: code,
        data: code === 200 ? data ? data : NETSTATUS[code] : NETSTATUS[code],
    }
};

/**
 * 对验证参数系统进行排错
 * @param validations
 * @returns {Function}
 */
module.exports.validate = function (validations) {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        console.log('err', errors);

        res.status(201).send({errors: errors.array()});
    };
};

/**
 * 验证参数系统中解密token并验证是否存在于数据库
 * @param token
 * @param req
 * @param location
 * @param path
 * @returns {Promise<*>}
 */
module.exports.checkToken = async function (token, {req, location, path}) {
    const db_authority = await mysql('TreeHome', 'authority');
    const openid = await jwt.decode(token);
    const dbData = await db_authority.find({openid});
    await db_authority.close();
    if (dbData.length === 0) {
        throw new Error('没有权限')
    }
    const {method} = req;
    return method == 'GET' ? req.query.openid = openid : req.body.openid = openid;
};
