const models = require('../models')
const moment = require('moment')
const {render, home_resJson} = require('../utils/res_data')
const Op = require('sequelize').Op
const trimHtml = require('trim-html')

function err_mess (message) {
  this.message = message
  this.name = 'UserException'
}

class Article {

  constructor () {}

  /**
   * 文章页面render
   * @param   {obejct} ctx 上下文对象
   */
  static async render_article (ctx) {

    let aid = ctx.params.aid

    let sql_article = await models.article.findOne({
      where: {
        aid: aid
      }
    }).then((res) => {
      res.create_at = moment(res.create_date).format('YYYY-MM-DD')
      return res
    })

    let findone_user = await models.user.findOne({
      where: {
        uid: sql_article.uid
      }
    })

    await models.article.update({
      read_count: Number(sql_article.read_count) + 1
    }, {
      where: {aid}//为空，获取全部，也可以自己添加条件
    })

    await render(ctx, {
      title: 'article',
      view_url: 'default/article',
      state: 'success',
      message: 'article',
      data: {
        article: sql_article,
        user: findone_user
      }
    })
  }

  /**
   * 新建文章页面render
   * @param   {obejct} ctx 上下文对象
   */
  static async render_writer (ctx) {
    await render(ctx, {
      title: 'writer',
      view_url: 'default/writer',
      state: 'success',
      message: 'writer'
    })
  }

  /**
   * 新建文章post提交
   * @param   {obejct} ctx 上下文对象
   */
  static async post_create_writer (ctx) {
    let formData = ctx.request.body

    try {

      if (!formData.title) {
        throw  new err_mess('请输入文章标题')
      }

      if (formData.title.length > 50) {
        throw  new err_mess('文章标题过长，请小于50个字符')
      }

      if (!formData.content) {
        throw  new err_mess('请输入文章内容')
      }

      if (!formData.topic_ids) {
        throw  new err_mess('请选择个人专题')
      }

      if (formData.source.length === 0 || formData.source === null) {
        throw  new err_mess('请选择文章来源类型')
      }

      if (!formData.tag_ids) {
        throw  new err_mess('请选择文章标签')
      }

    } catch (err) {
      home_resJson(ctx, {
        state: 'error',
        message: err.message
      })
      return false
    }

    try {
      await models.article.create({
        uid: ctx.session.uid,
        author: ctx.session.nickname,
        title: formData.title,
        excerpt: trimHtml(formData.origin_content).html, /*摘记*/
        content: formData.content, /*主内容*/
        origin_content: formData.origin_content, /*源内容*/
        source: formData.source, // 来源 （1原创 2转载）
        status: 1, // '状态(0:草稿;1:审核中;2:审核通过;3:回收站)'
        type: formData.type, // 类型 （1文章 2说说 3视频 4公告 ）
        create_date: moment().utc().utcOffset(+8).format(), /*时间*/
        create_date_timestamp: moment().utc().utcOffset(+8).format('X'), /*时间戳 */
        topic_ids: formData.topic_ids,
        tag_ids: formData.tag_ids
      }).then(function (data) {
        home_resJson(ctx, {
          state: 'success',
          message: '文章创建成功'
        })

      }).catch(function (err) {
        home_resJson(ctx, {
          state: 'error',
          message: err
        })
      })

    } catch (err) {
      home_resJson(ctx, {
        state: 'error',
        message: err.message
      })
    }

  }

  /**
   * 文章的标签页面
   * @param   {obejct} ctx 上下文对象
   */

  static async render_get_tag (ctx) {

    let article_tag_id = ctx.params.article_tag_id

    let page = ctx.query.page || 1
    let pageSize = ctx.query.pageSize || 25

    let find_article_tag = await models.article_tag.findOne({
      where: {
        article_tag_id: article_tag_id
      }
    })
    if (find_article_tag) {

      let {count, rows} = await models.article.findAndCountAll({
        where: {article_tag_ids: {[Op.like]: `%${article_tag_id}%`}},//为空，获取全部，也可以自己添加条件
        offset: (page - 1) * pageSize,//开始的数据索引，比如当page=2 时offset=10 ，而pagesize我们定义为10，则现在为索引为10，也就是从第11条开始返回数据条目
        limit: pageSize,//每页限制返回的数据条数
        order: [['create_date_timestamp', 'desc']]
      }).then((res) => {
        res.rows.map((item, key) => {
          item.create_at = moment(item.create_date).format('YYYY-MM-DD')
          return item
        })
        return res
      })

      let subscribe_count = await models.subscribe_article_tag.count({where: {article_tag_id}})

      /*所有文章专题*/
      let article_tag_all = await models.article_tag.findAll({
        attributes: ['article_tag_id', 'article_tag_name']
      })

      await render(ctx, {
        title: 'tag',
        view_url: 'default/tag',
        state: 'success',
        message: 'user',
        data: {
          page,
          count,
          pageSize,
          article_tag_id,
          subscribe_count,
          article_tag: find_article_tag,
          tag_all: article_tag_all,
          article_list: rows
        }
      })

    } else {
      ctx.redirect('/404')
    }
  }

  /**
   * 获取所有文章标签get
   * @param   {obejct} ctx 上下文对象
   */
  static async get_article_tag_all (ctx) {
    let article_tag_all = await models.article_tag.findAll({
      attributes: ['article_tag_id', 'article_tag_name'],
      where: {enable: true}//为空，获取全部，也可以自己添加条件
    })
    home_resJson(ctx, {
      state: 'success',
      message: '获取所有文章标签成功',
      data: {
        list: article_tag_all
      }
    })
  }

  /**
   * ajax 查询一篇文章
   * @param   {obejct} ctx 上下文对象
   */
  static async get_article (ctx) {

    let aid = ctx.query.aid

    let article = await models.article.findOne({
      where: {aid}
    })

    if (article) {
      home_resJson(ctx, {
        state: 'success',
        message: '获取文章成功',
        data: {
          article
        }
      })
    } else {
      home_resJson(ctx, {
        state: 'error',
        message: '获取文章失败'
      })
    }
  }

}

module.exports = Article