const mysql = require('mysql');

// test
const {mysqlConfig} = require('./databaseConfig');

/**
 *
 * @param database 数据库
 * @param table 数据表
 * @returns {Promise<void>}
 */
async function mysqlConnect(database, table) {
    const Mysql = {};

    Mysql.database = database;
    Mysql.table = table;
    Mysql.connection = await createMysqlObj();


    async function createMysqlObj() {
        const {database} = Mysql;
        const connection = await mysql.createConnection({
            ...mysqlConfig,
            database: database,
        });
        await connection.connect();
        return connection;
    }

    async function add(params) {
        let fieldsArr = [];
        let valuesArr = [];
        for (const _key in params) {
            fieldsArr.push(_key);
            valuesArr.push(`'${params[_key]}'`);
        }
        const sql_insert = `(${fieldsArr.join(',')}) VALUES (${valuesArr.join(',')})`;
        return await new Promise((resolve, reject) => {
            Mysql.connection.query(`insert into ${Mysql.table} ${fieldsArr.length ? sql_insert : ''}`, (error, results, fields) => {
                resolve(results);
            })
        })
    }

    async function find(params) {
        let paramsArr = [];
        for (const _key in params) {
            paramsArr.push(`${_key} like '%${params[_key]}%'`)
        }
        const fields = paramsArr.join(' and ');
        console.log(`select * from ${Mysql.table} ${fields ? 'where' : ''} ${fields}`)
        return await new Promise((resolve, reject) => {
            Mysql.connection.query(`select * from ${Mysql.table} ${fields ? 'where' : ''} ${fields}`, (error, results, fields) => {
                resolve(results);
            })
        })
    }

    async function update(params, newData) {
        let paramsArr = [];
        let dataArr = [];
        for (const key in params) {
            paramsArr.push(`${key} = '${params[key]}'`)
        }
        for (const key in newData) {
            dataArr.push(`${key} = '${newData[key]}'`)
        }
        const fields = paramsArr.join(' , ')
        const clause = dataArr.join(' , ')
        console.log('sql', `update ${Mysql.table} set ${clause} where ${fields}`)
        return await new Promise((resolve, reject) => {
            Mysql.connection.query(`update ${Mysql.table} set ${clause} where ${fields}`, (error, results, fields) => {
                resolve(results);
            })
        })
    }

    async function _delete(params) {
        let paramsArr = [];
        for (const key in params) {
            paramsArr.push(`${key} = '${params[key]}'`)
        }
        const fields = paramsArr.join(' , ')
        console.log('sql', `delete from ${Mysql.table} where ${fields}`)
        return await new Promise((resolve, reject) => {
            Mysql.connection.query(`delete from ${Mysql.table} where ${fields}`, (error, results, fields) => {
                resolve(results);
            })
        })
    }

    async function _close() {
        Mysql.connection.end();
    }

    async function sql(sql,params){
        let paramsArr = [];
        for (const key in params) {
            paramsArr.push(`${key} = '${params[key]}'`)
        }
        const fields = paramsArr.join(' , ')
        console.log('sql', `delete from ${Mysql.table} where ${fields}`)
        return await new Promise((resolve, reject) => {
            Mysql.connection.query(`${sql} where ${fields}`, (error, results, fields) => {
                resolve(results);
            })
        })
    }

    Mysql.add = add;            // 增(增加一条数据)
    Mysql.find = find;          // 查
    Mysql.update = update;      // 改(修改字段数据，或新增一个字段)
    Mysql.delete = _delete;     // 删
    Mysql.close = _close;       // 关
    Mysql.sql = sql;

    return Mysql
}

module.exports = mysqlConnect;
