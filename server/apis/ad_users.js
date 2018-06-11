const { format_login, format_data } = require('../utils/res_data')
const tokens = require('../utils/tokens')
const { checkUserName, checkPwd, checkEmail } = require('../utils/validators')
const { tools: { encrypt } } = require('../utils')
const config = require('../../config')
const { sequelize, ad_user, ad_user_role } = require('../models')
const moment = require('moment')

function err_mess(message) {
  this.message = message
  this.name = 'UserException'
}

class Ad_users {
  constructor() {
    // super()
  }
  /**
   * 登录操作
   * @param  {obejct} ctx 上下文对象
   */
  static async ad_sign_in(ctx) {
    let { account, password, uid } = ctx.request.body
    let ad_user_findOne = {}
    try {
      if (!account) {
        throw new err_mess('请输入账户!')
      }
      if (!checkUserName(account)) {
        throw new err_mess('5-12个英文字符!')
      }
      if (!password) {
        throw new err_mess('请输入密码!')
      }
      ad_user_findOne = await ad_user.findOne({ where: { account } })
      if (!ad_user_findOne) {
        throw new err_mess('用户不存在!')
      }
      if (!(encrypt(password, config.encrypt_key) === ad_user_findOne.password)) {
        throw new err_mess('密码错误!')
      }
      if (!ad_user_findOne.enable) {
        throw new err_mess('您已被限制登录!')
      }

    } catch (err) {
      format_login(ctx, {
        state: 'error',
        message: err.message
      }, false)
      return false
    }

    let find_user_role = await ad_user_role.findOne({ where: { uid: ad_user_findOne.uid } })
    let datas = { account, role_id: find_user_role ? find_user_role.role_id : '' }
    let token = tokens.setToken('cxh', 3000, datas)
    format_login(ctx, {
      state: 'success',
      message: '登录成功',
      token
    })

  }

  /**
   * 注册操作
   * @param   {obejct} ctx 上下文对象
   */
  static async create_admin_user(ctx) {
    const req_data = ctx.request.body

    try {
      if (!req_data.account) {
        throw new err_mess('请输入账户!')
      }
      if (!req_data.nickname) {
        throw new err_mess('请输入昵称!')
      }
      if (!checkUserName(req_data.account)) {
        throw new err_mess('账户须5-12个英文字符!')
      }
      if (!req_data.password) {
        throw new err_mess('请输入密码!')
      }
      if (!checkPwd(req_data.password)) {
        throw new err_mess('密码输入有误!')
      }
      if (!checkEmail(req_data.email)) {
        throw new err_mess('邮箱输入有误!')
      }
      let ad_user_findOne = await await ad_user.findOne({ where: { account: req_data.account } })

      if (ad_user_findOne) {
        throw new err_mess('账户已存在!')
      }

    } catch (err) {
      format_data(ctx, {
        state: 'error',
        message: err.message
      })
      return false
    }

    await ad_user.create({
      account: req_data.account,
      nickname: req_data.nickname,
      password: encrypt(req_data.password, config.encrypt_key),
      email: req_data.email,
      phone: req_data.phone,
      reg_time: moment().utc().utcOffset(+8).format('X'),
      reg_ip: ctx.request.ip,
      enable: req_data.enable || false
    })
      .then(function (p) {
        format_data(ctx, {
          state: 'success',
          message: '注册成功'
        })
      }).catch(function (err) {
        format_data(ctx, {
          state: 'error',
          message: '注册失败'
        })
      })
  }

  /**
   * 更新管理员用户
   * @param   {obejct} ctx 上下文对象
   */
  static async edit_admin_user(ctx) {
    const res_data = ctx.request.body
    await ad_user.update({
      account: res_data.account,
      nickname: res_data.nickname,
      password: encrypt(res_data.password, config.encrypt_key),
      email: res_data.email,
      phone: res_data.phone,
      enable: res_data.enable || false
    }, {
        where: {
          uid: res_data.uid//查询条件
        }
      })
      .then(function (p) {
        format_data(ctx, {
          state: 'success',
          message: '更新成功'
        })
      }).catch(function (err) {
        format_data(ctx, {
          state: 'error',
          message: '更新失败'
        })
      })
  }

  /**
   * 获取用户列表操作
   * @param   {obejct} ctx 上下文对象
   */
  static async get_admin_user_list(ctx) {
    const { page = 1, pageSize = 10 } = ctx.query
    let { count, rows } = await ad_user.findAndCountAll({
      attributes: ['uid', 'account', 'nickname', 'email', 'phone', 'reg_time', 'last_sign_time', 'reg_ip', 'enable'],
      where: '',//为空，获取全部，也可以自己添加条件
      offset: (page - 1) * Number(pageSize),//开始的数据索引，比如当page=2 时offset=10 ，而pagesize我们定义为10，则现在为索引为10，也就是从第11条开始返回数据条目
      limit: Number(pageSize)//每页限制返回的数据条数
    })
    format_data(ctx, {
      state: 'success',
      message: '返回成功',
      data: {
        count: count,
        admin_user_list: rows
      }
    })

  }

  /**
   * 删除用户
   * @param   {obejct} ctx 上下文对象
   * 删除用户先判断管理员角色表中是否有关联，
   * 无关联则直接管理员删除，有关联则开启事务同时删除管理员角色关联表中关联
   * 管理员对角色是一多一的关系
   */
  static async delete_admin_user(ctx) {

    const { uid } = ctx.request.body

    let find_admin_user_role = await ad_user_role.findOne({ where: { uid } })

    if (!find_admin_user_role) { /* 无关联 */
      await ad_user.destroy({ 'where': { uid } })
        .then(function (p) {
          format_data(ctx, {
            state: 'success',
            message: '删除管理员用户成功'
          })
        }).catch(function (err) {
          format_data(ctx, {
            state: 'error',
            message: '删除管理员用户失败'
          })
        })
    } else {   /* 有关联 */
      // 创建事务
      await sequelize.transaction(function (transaction) {
        // 在事务中执行操作
        return ad_user.destroy({ 'where': { uid } }, { transaction })
          .then(function (delete_admin_user) {
            return ad_user_role.destroy({ where: { uid } }, { ...transaction })
          });

      }).then(function (results) {
        format_data(ctx, {
          state: 'success',
          message: '删除管理员用户成功,同时删除管理员角色关联'
        })
      }).catch(function (err) {
        format_data(ctx, {
          state: 'error',
          message: '删除管理员用户失败,同时回滚所有操作'
        })
      });

    }

  }

}

module.exports = Ad_users