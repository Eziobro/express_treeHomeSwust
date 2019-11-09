```
mongoDBURL  // mongoDB 地址
```

#### 使用
```
const MongoDB = require('../connectMongoDB');


const db = await MongoDB('spider', 'douban');
db.list() // 查
...
```
