import { fetch } from '@request'

export default {
  GET_USER_TOPIC: ({ commit, dispatch, state }, { uid }) => { // 注册发送验证码
    return fetch({
      url: '/user/topic_all',
      method: 'get',
      parameter: { params: { uid } }
    })
  },
  CREATE_ARTICLE_TOPIC: ({ commit, dispatch, state }, data) => {
    return fetch({
      url: '/personal/create_article_topic',
      method: 'post',
      parameter: { ...data }
    })
  },
  UPLOAD_ARTICLE_PICTURE: ({ commit, dispatch, state }, data) => {
    return fetch({
      url: '/article/upload_article_picture',
      method: 'post',
      parameter: data
    })
  },
  SAVE_ARTICLE: ({ commit, dispatch, state }, data) => {
    return fetch({
      url: '/article/create',
      method: 'post',
      parameter: data
    })
  }
}
