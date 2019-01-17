import http from '../../../utils/http'

export const create_admin_authority = (data, callback) => {
  return (dispatch) => {
    http.post('/create_admin_authority', data)
      .then((res) => {
        if (callback) {
          callback(res)
        }
      })
  }
}

function filterArray (result, pid) {
  let _array = []
  for (let i in result) {
    if (result[i].authority_parent_id === pid) {
      result[i].children = filterArray(result, result[i].authority_id)
      _array.push(result[i])
    }
  }
  return _array
}

export const get_admin_authority_list = (data, callback) => {
  return (dispatch) => {
    http.get('/get_admin_authority_list', data)
      .then((res) => {
        if (callback) {
          callback(filterArray(res, ''))
        }
        return dispatch({
          type: 'GET_ADMIN_AUTHORITY_LIST',
          data: res
        })
      })
  }
}

export const delete_admin_authority = (data, callback) => {
  return (dispatch) => {
    http.post('/delete_admin_authority', data)
      .then((res) => {
        if (callback) {
          callback(res)
        }
      })
  }
}

export const update_admin_authority = (data, callback) => {
  return (dispatch) => {
    http.post('/update_admin_authority', data)
      .then((res) => {
        if (callback) {
          callback(res)
        }
      })
  }
}

