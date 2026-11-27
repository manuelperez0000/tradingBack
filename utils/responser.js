/* eslint-disable no-undef */
function success({ res, message = 'success', body = {}, status = 200 }) {
    return res.status(status).json({
        body,
        message,
        status
    })
}

function error({ res, message = "Error desconocido", body = {}, status = 500 }) {
    return res.status(status).json({
        body,
        message,
        status
    })
}

export default {
    success,
    error
}