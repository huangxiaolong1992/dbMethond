# dbMethond

/*  @des ：mongodb 数据库curd 封装
 *  @params: collection 集合，即所用查询的表名，
 *  @params  params  参数,
 *  @params  updateData  更新方法中要更新的数据,
 *  @method query  不分页查询
 *  @method create 新增
 *  @method delete 删除
 *  @method doErr 统一处理错误信息
 *  @return 
*/


/*  @des ：mongodb 数据库分页 封装
 *  @params: parameter[0] 集合，即所用查询的表名，  parameter[1] 参数   parameter[2] 第几页    
 *  @params: parameter[3] 一页多少条 parameter[4] 排序条件 parameter[5] 回调
 *  @return   
*/



/*  @des ：redis 数据库 封装 
    @params collection mongodb表名  params 【传递的mongodb 所查询的参数】  updateData 【mongodb 所查询的参数】 client 【redis的客户端名】  key 【redis的key】   callback 【回调】 redisParam 【哈希的值】 , expire 【过期时间】
    @method hmset 设置哈希
    @method hgetall 获取哈希
    @method removeCache 清除指定的缓存数据（用处：同步两个数据库中的数据）
    @method addCache 增加指定的缓存数据（用处：同步两个数据库中的数据）
    @method expire 设置过期时间
*/




/*  @des ：redis 数据库分页 和mongodb 数据库 数据同步封装
 *  @params: parameter[0] 客户端名  parameter[1] 列表数据的key   parameter[2] 開始的位置 
 *  @params: parameter[3] 结束的位置  parameter[4] 第几页 parameter[5] 一页多少条数据
 *  @params: parameter[6] mongodb的查询的表  parameter[7] 查询的mongodb分页查询，如没有参数，传递false 
 *  @params: parameter[8] 查询条件 parameter[9] 回调  parameter[10] 过期时间  
 *  @return 
*/