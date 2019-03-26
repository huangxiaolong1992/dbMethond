
/*  @des ：mongodb 数据库curd 封装
 *  @params: collection 集合，即所用查询的表名，
 *  @params  params  参数,
 *  @params  updateData  更新方法中要更新的数据,
 *  @method query  不分页查询
 *  @method create 新增
 *  @method delete 删除
 *  @method doErr 统一处理错误信息
 *  @method doSuccess 统一处理成功信息
 *  @return 
*/

class DbOperate {
    constructor (collection, params , updateData) {
        this.collection = collection;
        this.params = params;
        this.updateData = updateData;
    }
    
    doErr (err) {
        let errMsg = {
            code : 500,
            msg : "服务异常",
            result : err
        }

        return errMsg; 
    } 

    doSuccess (successMsg, res) {
        let sucMsg = {
            code : 200,
            msg : successMsg,
            result : res
        }

        return sucMsg;
    }

    async query () { 
        let result = await this.collection.find(this.params);

        try{
            return this.doSuccess("查询成功", result);
        }
        catch(err){
            return this.doErr(err);
        }    
    }

    async create () {
        let result  = await this.collection.create(this.params);

        try{
            return this.doSuccess("创建成功", result);
        }
        catch(err){
            return this.doErr(err);
        } 
    }

    async delete () {
        let result = await this.collection.remove(this.params);

        try{
            return this.doSuccess("删除成功", result);
        }
        catch(err){
            return this.doErr(err);
        } 
    }

    async update () {     
        let result = await this.collection.update(this.params,this.updateData);

        try{
            return this.doSuccess("更新成功", result);
        }
        catch(err){
            return this.doErr(err);
        } 
    }
}



/*  @des ：mongodb 数据库分页 封装
 *  @params: parameter[0] 集合，即所用查询的表名，  parameter[1] 参数   parameter[2] 第几页    
 *  @params: parameter[3] 一页多少条 parameter[4] 排序条件 parameter[5] 回调
 *  @return   
*/


async function pageQuery (...parameter) {
    
    var collection = parameter[0],

        params = parameter[1],

        index = parameter[2],

        rows = parameter[3],

        sort = parameter[4],

        callback = parameter[5];

    var pagesize; 

    var callback = callback || function () {};

    //参数不存在，即赋值{}，查询所有
    var params = !params ? {} : params;

    collection.count(params, (err,doc)=>{

        pagesize = doc;

    })
      
    await collection.find(params,(err,doc)=>{
         
        if(err){
            var data = {
                code : 500,
                msg : "查询失败",
                result : err
            }
        }else{
            let n = Math.ceil(pagesize / rows);  //总共多少页
            var data = {
                code : 200,
                msg : "查询成功",
                totalItem : pagesize, //总条数
                totalPage : n, //总共多少页
                rows      : rows, //每页显示多少条
                index     : index,//当前页数
                result    : doc
            }
        }
        
        callback({
            res : data
        });
       
    }).sort(sort).skip((index - 1) * rows).limit(rows);
}


/*  @des ：redis 数据库 封装 
    @params collection mongodb表名  params 【传递的mongodb 所查询的参数】  updateData 【mongodb 所查询的参数】 client 【redis的客户端名】  key 【redis的key】   callback 【回调】 redisParam 【哈希的值】 , expire 【过期时间】
    @method hmset 设置哈希
    @method hgetall 获取哈希
    @method removeCache 清除指定的缓存数据（用处：同步两个数据库中的数据）
    @method addCache 增加指定的缓存数据（用处：同步两个数据库中的数据）
    @method expire 设置过期时间
*/

  
class RedisOperate extends DbOperate {

    constructor(collection , params , updateData , client , key , callback , redisParam , expire) {

        super(collection , params , updateData);

        this.client = client;

        this.key = key;

        this.redisParam = redisParam;

        this.expire = expire;
 
        this.callback = callback || function () {};
    }

    async expireTime () {
        //设置过期时间和判断是否设置过期机制  
        
        this.expire ? this.client.expire(this.key, this.expire) : "";
    }

    async hmset () {  
        //判断 redisParam 过来是否为对象，是的话，就进行redis存储，否则抛出异常
        
        if(this.redisParam.constructor === Object){

            this.client.hmset(this.key,  this.redisParam ,(err , result)=>{
                
                if(err) return this.callback(super.doErr(err));

                this.callback(result);

                this.expireTime();
            });

        }else{

            throw "Error：参数只能为对象";
        } 
    }

    async hgetall () {
        //获取的话  redisParam 设置为false
        this.client.hgetall(this.key, (err , result) => {

           if(err) return this.callback(super.doErr(err));

           this.callback(result);
        });   
    }

    async removeCache () {
   
        this.query(this.collection , this.params).then((v)=>{
     
            if(v.code == 200){
                 
                this.delete(this.collection , this.params).then((res)=>{
          
                    if(res.code == 200){
         
                        this.client.zrem(this.key, JSON.stringify(v.result[0]), 0 , -1, (err, result)=>{
                            //如果缓存删除失败，为降低脏数据的存在性，回过头去增加Mongodb对应的数据 
                            if(err) {

                                this.addCache(this.collection , this.params).then((v)=>{
                                    
                                    this.callback(v);
                                });

                            }else{

                                this.callback(v);
                            } 
                              
                        });         
                    }else{
                      
                       this.callback(super.doErr(res));
                    }
                });
                              
            }  
        })
    }

    async addCache () {
      
        this.create(this.collection , this.params).then((v)=>{
            
            if(v.code == 200){
       
                this.client.zadd(this.key, new Date().getTime(), JSON.stringify(v.result), (err, result)=>{

                    if(err) {
                        //如果缓存添加失败，为降低脏数据的存在性，回过头去删除Mongodb对应的数据
                        this.removeCache(this.collection , this.params).then((v)=>{

                            this.callback(v);
                        });
                       
                    }else{

                        this.callback(v);
                    }
                      
                });
            }else{

                this.callback(super.doErr(v));
            }
        })
    }

    async updateCache () {

        this.query(this.collection , this.params).then((v)=>{

            if(v.code == 200){
                 
                this.update(this.collection , this.params , this.updateData).then((res)=>{
          
                    if(res.code == 200){

                        this.client.zrem(this.key, JSON.stringify(v.result[0]), 0 , -1, (err, result)=>{
                         
                            if(err) {
                                
                            }else{

                                this.client.zadd(this.key, new Date().getTime(), JSON.stringify(this.updateData), (err, result)=>{

                                    this.callback(v);
                                })
                            }        
                        });
                    }else{

                         this.callback(super.doErr(res));
                    }
                });                
            } 
        })
    }
}

/*  @des ：redis 数据库分页 和mongodb 数据库 数据同步封装
 *  @params: parameter[0] 客户端名  parameter[1] 列表数据的key   parameter[2] 開始的位置 
 *  @params: parameter[3] 结束的位置  parameter[4] 第几页 parameter[5] 一页多少条数据
 *  @params: parameter[6] mongodb的查询的表  parameter[7] 查询的mongodb分页查询，如没有参数，传递false 
 *  @params: parameter[8] 查询条件 parameter[9] 回调  parameter[10] 过期时间  
 *  @return 
*/

function redisPageQuery(...parameter) {

    let client = parameter[0],

        key = parameter[1];
     
        start = parameter[2],

        stop = parameter[3],

        index = parameter[4],

        rows = parameter[5],

        collection = parameter[6]

        params = parameter[7],

        sort = parameter[8],

        expireTime = parameter[9],

        callback = parameter[10];

    var callback = callback || function () {};
    
    //参数不存在，即赋值{}，查询所有
    var params = !params ? {} : params;
    

    //统一处理错误信息
    let doErr = () => {
        var data = {
            code   : 500,
            msg    : "查询失败"
        }

        callback(data);
    }
       
    client.zcard( key, (err,result)=>{

        if(err){
            
            doErr();

        }else{
           
            let len = result,
                    
                n = Math.ceil(len / rows);  //总共多少页
            //不等於 0 代表key在redis已经存在
            if(result != 0){
                
                let getSort = Object.values(sort).join(" ");
                

                let sortResult = (res)=> {
                    for(let i = 0 , len = res.length ; i < len ; i++ ){

                        res[i] = JSON.parse(res[i]);
                    }
                                 
                    var data = {
                        code      : 200,
                        msg       : "查询成功",
                        totalItem : len, //总条数
                        totalPage : n, //总共多少页
                        rows      : rows,//每页显示多少条
                        index     : index,
                        result    : res
                    }  

                    callback({
                        res : data
                    });
                }

                //1为升序，-1为降序
                if(getSort == 1){

                    let args = [ key , '-inf',  '+inf',  'limit', start , stop ];

                    client.zrangebyscore(args, (err,res)=>{
                        
                        sortResult(res);   
                    })
                }else{

                    let args = [ key , '+inf',  '-inf',  'limit', start , stop ];

                    client.zrevrangebyscore(args, (err,res)=>{
                        
                        sortResult(res);;
                    })
                }

           }else{
              //不存在，就去调用DbOperate查询 去mongodb 里查询，然后返回给前端,并且同步存储redis
                pageQuery(collection, params , index, rows, sort,    
                 (result)=>{

                    if(result.res.code == 200){

                        new DbOperate(enforcementDetail, params).query().then((v)=>{
                            
                            if(v.code == 200){

                                let vResult = v.result ;

                                let queue = [];

                                for(let i = 0 ; i < vResult.length  ; i++){

                                    let time = new Date().getTime();

                                    queue.push(time , JSON.stringify(vResult[i]));         
                                } 
                                 
                                let zdd = () => {
                                    client.zadd( key, queue ,(error,res)=>{
                                        if(error){                                          
                                            zdd();                 
                                        }else{
                                            callback(result); 
                                        }                                  
                                    });  
                                }

                                zdd();
 
                                //设置过期时间和判断是否设置过期机制
                                expireTime ?  client.expire(key, expireTime) : "";   
                            
                            }else{
                                doErr();
                            }    
                                   
                        }) 
                    }else{

                        doErr();
                    } 
                }) 
           }   
        }
   })
}


module.exports = {
    DbOperate      : DbOperate,
    pageQuery      : pageQuery,
    RedisOperate   : RedisOperate,
    redisPageQuery : redisPageQuery
}


//调用方式  mongodb

/*
  不分页查询

 */ 
 //例如 utils.DbOperate(collection, {id:1}).query().then((v)=>{})

/*
  删除
 */

 //例如 utils.DbOperate(collection, {id:1} ).delete().then((v)=>{})
 

/*
  新增
 */

//例如 utils.DbOperate(collection, {title : 1}).create().then((v)=>{})


/*
  更新
 */ 
//例如 utils.DbOperate(collection, {id:1} , {title : 1}).update().then((v)=>{})



/*
   分页查询
 */
//例如 utils.pageQuery(enforcementDetail,false ,{index : 1 , rows : 10}, {time: -1},(result)=>{}) false 代表查询所有






//redis 调用方式

/*
 分页查询
 */

//例如 utils.redisPageQuery(client , `lawData${type}` ,  (index - 1) * rows , (index) * rows , index , rows , enforcementDetail, {type:type}, {time : -1},false,(result)=>{ res.json(result);})

//


/*

哈希设置与获取

 */
//例如  设置 new RedisOperate(false,false , false ,client , "b1" , (res)=> {console.log(res)} ,{"a2":2},false).hmset()
//
//     获取  new utils.RedisOperate(false,false , false,client,"b1",(res) =>{   console.log(res)}).hgetall()
//     
//     
//     
//清除指定的缓存数据  Object 必须是个对象
//
//
//例如 new utils.RedisOperate(enforcementDetail, { _id: id},false,client,'lawData1',(result)=>{ res.json(result);}).removeCache();
//


//增加指定的缓存数据 并且同步redis
//
//
//例如 new utils.RedisOperate( enforcementDetail, {type: type,title: title,text: text, time: time,videoSrc: videoSrc },false,client,`lawData${type}`,(result)=>{res.json(result); }).addCache();
//
//
//
//更新指定的缓存数据 mongodb和redis同步