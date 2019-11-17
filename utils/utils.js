const Crypto = require('cryptojs/cryptojs.js').Crypto;
const {COS, NETSTATUS} = require('../utils/Enum');
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

module.exports = function fixedZero(val) {
    return val * 1 < 10 ? `0${val}` : val;
};

/**
 *
 * @param nodeList
 * @param parentPath
 * @returns {Array}
 */
module.exports = function getPlainNode(nodeList, parentPath = '') {
    const arr = [];
    nodeList.forEach(node => {
        const item = node;
        item.path = `${parentPath}/${item.path || ''}`.replace(/\/+/g, '/');
        item.exact = true;
        if (item.children && !item.component) {
            arr.push(...getPlainNode(item.children, item.path));
        } else {
            if (item.children && item.component) {
                item.exact = false;
            }
            arr.push(item);
        }
    });
    return arr;
};

module.exports = function getRelation(str1, str2) {
    if (str1 === str2) {
    }
    const arr1 = str1.split('/');
    const arr2 = str2.split('/');
    if (arr2.every((item, index) => item === arr1[index])) {
        return 1;
    }
    if (arr1.every((item, index) => item === arr2[index])) {
        return 2;
    }
    return 3;
}

module.exports = function getRenderArr(routes) {
    let renderArr = [];
    renderArr.push(routes[0]);
    for (let i = 1; i < routes.length; i += 1) {
        // 去重
        renderArr = renderArr.filter(item => getRelation(item, routes[i]) !== 1);
        // 是否包含
        const isAdd = renderArr.every(item => getRelation(item, routes[i]) === 3);
        if (isAdd) {
            renderArr.push(routes[i]);
        }
    }
    return renderArr;
}

/**
 * Get router routing configuration
 * { path:{name,...param}}=>Array<{name,path ...param}>
 * @param {string} path
 * @param routerData
 */
module.exports = function getRoutes(path, routerData) {
    let routes = Object.keys(routerData).filter(
        routePath => routePath.indexOf(path) === 0 && routePath !== path,
    );
    // Replace path to '' eg. path='user' /user/name => name
    routes = routes.map(item => item.replace(path, ''));
    // Get the route to be rendered to remove the deep rendering
    const renderArr = getRenderArr(routes);
    // Conversion and stitching parameters
    return renderArr.map(item => {
        const exact = !routes.some(route => route !== item && getRelation(route, item) === 1);
        return {
            exact,
            ...routerData[`${path}${item}`],
            key: `${path}${item}`,
            path: `${path}${item}`,
        };
    });
};

/* eslint no-useless-escape:0 */
const reg = /(((^https?:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+(?::\d+)?|(?:www.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)$/;

module.exports = function isUrl(path) {
    return reg.test(path);
};

module.exports = function deepCopy(o) {
    const isArray = o instanceof Array;
    const isObject = o instanceof Object;
    if (!isObject) return o;
    const n = (isArray ? [] : {});
    for (const k in o) n[k] = deepCopy(o[k]);
    return n;
};

module.exports = function findValueByKey(key, src, type, defaults) {
    const result = src.filter((current) => {
        return current.key == key;
    })[0];
    return result ? (type ? result[type] : result.value) : type ? defaults : '空';
};

module.exports = function filter(obj, func) {
    let result = {};
    for (let _key in obj) {
        if (obj.hasOwnProperty(_key) && func(_key, obj[_key])) {
            result[_key] = obj[_key];
        }
    }
    return result;
};

/**
 * 省略过长的字符串
 * @param str 需要检索的字符串
 * @param maxLen 字符串的最大长度
 * @returns {string}
 */
module.exports = function Ellipsis(str, maxLen) {
    str = str.trim();
    if (typeof str != 'string') {
        return '请传入字符串'
    }
    if (typeof maxLen != 'number') {
        return '请传入数字'
    }
    if (str.length > maxLen) {
        str = str.substr(0, maxLen);
        return str + '...';
    }
    return str;
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
 *
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
 * @description
 * 对称解密
 * @param encryptedData
 * @param sessionKey
 * @param {*} iv 向量
 * @returns
 */
module.exports.cipherivDecrypt = function (encryptedData, sessionKey, iv) {
    // base64 decode ：使用 CryptoJS 中 Crypto.util.base64ToBytes()进行 base64解码
    var encryptedData = Crypto.util.base64ToBytes(encryptedData)
    var key = Crypto.util.base64ToBytes(sessionKey);
    var iv = Crypto.util.base64ToBytes(iv);

    // 对称解密使用的算法为 AES-128-CBC，数据采用PKCS#7填充
    var mode = new Crypto.mode.CBC(Crypto.pad.pkcs7);

    try {
        // 解密
        var bytes = Crypto.AES.decrypt(encryptedData, key, {
            asBpytes: true,
            iv: iv,
            mode: mode
        });

        var decryptResult = JSON.parse(bytes);

    } catch (err) {
        console.log(err)
    }

    return decryptResult
};

module.exports.checkPath = function (path) {
    const reg = /\//gi
}

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

module.exports.verifyToken = function (token, privateKey, callback) {
    let data;
    jwt.verify(token, privateKey, (error, decoded) => {
        data = error || decoded;
        callback(error, decoded);
    });
    return data;
};

module.exports._decryptData = function (encryptedData, sessionKey, iv) {
    let decoded;
// base64 decode
    var sessionKey = Buffer.from(sessionKey, 'base64').toString('utf8')
    encryptedData = Buffer.from(encryptedData, 'base64').toString('utf8')
    iv = Buffer.from(iv, 'base64').toString('utf8')

    try {
        // 解密
        const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKey, iv);
        // 设置自动 padding 为 true，删除填充补位
        decipher.setAutoPadding(true)
        decoded = decipher.update(encryptedData, 'binary', 'utf8');
        decoded += decipher.final('utf8')

        decoded = JSON.parse(decoded)

    } catch (err) {
        console.log('err', err);
    }

    return decoded
}

module.exports.decodeToken = function (token) {
    return jwt.decode(token);
};

module.exports.dataDeal = function (code, data) {
    return {
        code: code,
        data: code === 200 ? data ? data : NETSTATUS[code] : NETSTATUS[code],
    }
};

module.exports.isGetRequire = function (data = []) {
    if (data.length === 0) {
        return true
    }
    return !data.some(item => item == "");
}
