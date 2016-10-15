## magicbook

## Dev

* node环境:  请一定切换node版本到 `v6.5.0`
* git clone 代码
* make install  安装依赖， 如需加速， 请先安装 `npm install -g cnpm`
* 启动调试，多种方式
  * bin/start -d 默认打开 example 目录
  * bin/start 在首页

* 默认窗口中不打开调试器， 如果需要devtool， 按:  `cmd + i`

## 结构

###  app入口 main.js


### web容器的主模板 view/main.html

  * 加载基础依赖
  * 实现路由

### 控制器 controller

### 模型层 model

  * ui model  model/ui
  * data model model/data

### 编辑器  codemirror

### 暂时不建议引入ui库，保持简洁

## 功能列表

  * bookspace, 类似于workspace的概念，方便多本书之间的管理
    * list books
    * create book
    * edit book property
    * delete book

  * bookedit
    * open book
    * menu (create/delete/edit/order chapter)
    * edit file and save file
    * preview file

  * tools
    * theme
    * export
      * export as pdf
      * export as web site
    * git
      * commit
      * logs

## LICENSE

[~]